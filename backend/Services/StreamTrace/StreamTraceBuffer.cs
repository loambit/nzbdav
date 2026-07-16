using System.Collections.Concurrent;
using NzbWebDAV.Database.Models.Metrics;

namespace NzbWebDAV.Services.StreamTrace;

/// <summary>
/// In-memory ring buffer of playback stream events keyed by ReadSessionId.
/// Same lifetime model as LogBufferSink: process-local, dump before restart.
/// </summary>
public sealed class StreamTraceBuffer
{
    private readonly int _capacity;
    private readonly int _maxSessions;
    private readonly StreamTraceEvent?[] _buffer;
    private readonly object _gate = new();
    private long _nextSequence;

    // Newest session first for summary listing.
    private readonly ConcurrentDictionary<Guid, SessionMeta> _sessions = new();

    public StreamTraceBuffer(int capacity, int maxSessions = 200, bool enabled = true)
    {
        Enabled = enabled;
        _capacity = Math.Max(100, capacity);
        _maxSessions = Math.Max(10, maxSessions);
        _buffer = new StreamTraceEvent?[enabled ? _capacity : 0];
    }

    public int Capacity => _capacity;

    /// <summary>
    /// Tracing is opt-in (STREAM_TRACE_EVENTS &gt; 0). When disabled, Record is
    /// a no-op so production deployments pay no memory or hot-path cost.
    /// </summary>
    public bool Enabled { get; }

    public void Record(StreamTraceEvent entry)
    {
        if (!Enabled) return;
        var sequence = Interlocked.Increment(ref _nextSequence);
        var withSeq = entry with { Sequence = sequence };
        lock (_gate)
        {
            _buffer[(sequence - 1) % _capacity] = withSeq;
        }

        _sessions.AddOrUpdate(
            entry.SessionId,
            _ => new SessionMeta
            {
                SessionId = entry.SessionId,
                FirstAt = entry.AtUnixMs,
                LastAt = entry.AtUnixMs,
                Path = entry.Path,
                EventCount = 1,
                LastKind = entry.Kind,
            },
            (_, existing) =>
            {
                existing.LastAt = entry.AtUnixMs;
                existing.EventCount++;
                existing.LastKind = entry.Kind;
                if (!string.IsNullOrEmpty(entry.Path)) existing.Path = entry.Path;
                return existing;
            });

        TrimSessionsIfNeeded();
    }

    public void RangeOpen(
        Guid sessionId,
        string path,
        string method,
        long rangeStart,
        long? rangeEnd,
        long? fileSize,
        string? userAgent,
        string? clientIp)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.RangeOpen.ToString(),
            Path = path,
            Method = method,
            RangeStart = rangeStart,
            RangeEnd = rangeEnd,
            FileSize = fileSize,
            UserAgent = userAgent,
            ClientIp = clientIp,
        });
    }

    public void Seek(Guid sessionId, long offset)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.Seek.ToString(),
            Offset = offset,
        });
    }

    public void Segment(
        Guid sessionId,
        string provider,
        SegmentFetch.FetchStatus status,
        int durationMs,
        int retries,
        string? segmentId = null)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.Segment.ToString(),
            Provider = provider,
            Status = StreamTraceEvent.StatusName(status),
            DurationMs = durationMs,
            Retries = retries,
            SegmentId = StreamTraceEvent.TruncateSegmentId(segmentId),
        });
    }

    public void ZeroFill(Guid sessionId, string segmentId, long bytes, string? message = null)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.ZeroFill.ToString(),
            SegmentId = StreamTraceEvent.TruncateSegmentId(segmentId),
            Bytes = bytes,
            Message = message,
        });
    }

    public void Failover(Guid sessionId, string fromProvider, string toProvider, string? reason = null)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.Failover.ToString(),
            FromProvider = fromProvider,
            ToProvider = toProvider,
            Status = reason,
        });
    }

    public void Retry(Guid sessionId, string segmentId, int attempt, string? message = null)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.Retry.ToString(),
            SegmentId = StreamTraceEvent.TruncateSegmentId(segmentId),
            Attempt = attempt,
            Message = message,
        });
    }

    public void RangeEnd(
        Guid sessionId,
        ReadSession.EndReasonCode endReason,
        long bytesServed,
        string? message = null)
    {
        Record(new StreamTraceEvent
        {
            Sequence = 0,
            AtUnixMs = Now(),
            SessionId = sessionId,
            Kind = StreamTraceKind.RangeEnd.ToString(),
            EndReason = StreamTraceEvent.EndReasonName(endReason),
            BytesServed = bytesServed,
            Message = message,
        });
    }

    public IReadOnlyList<StreamTraceSessionSummary> ListSessions(int limit = 50)
    {
        return _sessions.Values
            .OrderByDescending(s => s.LastAt)
            .Take(Math.Clamp(limit, 1, 500))
            .Select(s => new StreamTraceSessionSummary(
                s.SessionId,
                s.Path,
                s.FirstAt,
                s.LastAt,
                s.EventCount,
                s.LastKind))
            .ToList();
    }

    public IReadOnlyList<StreamTraceEvent> GetSessionEvents(Guid sessionId)
    {
        if (!Enabled) return [];

        StreamTraceEvent[] copy;
        lock (_gate)
        {
            copy = new StreamTraceEvent[_capacity];
            _buffer.CopyTo(copy, 0);
        }

        return copy
            .Where(e => e is not null && e.SessionId == sessionId)
            .OrderBy(e => e!.Sequence)
            .Select(e => e!)
            .ToList();
    }

    private void TrimSessionsIfNeeded()
    {
        if (_sessions.Count <= _maxSessions) return;
        var excess = _sessions.Values
            .OrderBy(s => s.LastAt)
            .Take(_sessions.Count - _maxSessions)
            .Select(s => s.SessionId)
            .ToList();
        foreach (var id in excess)
            _sessions.TryRemove(id, out _);
    }

    private static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    private sealed class SessionMeta
    {
        public Guid SessionId { get; init; }
        public long FirstAt { get; set; }
        public long LastAt { get; set; }
        public string? Path { get; set; }
        public int EventCount { get; set; }
        public string? LastKind { get; set; }
    }
}

public sealed record StreamTraceSessionSummary(
    Guid SessionId,
    string? Path,
    long FirstAt,
    long LastAt,
    int EventCount,
    string? LastKind);
