using System.Text.Json.Serialization;

namespace NzbWebDAV.Api.Controllers.GetStreamTraces;

public class GetStreamTracesResponse : BaseApiResponse
{
    [JsonPropertyName("enabled")] public required bool Enabled { get; init; }
    [JsonPropertyName("capacity")] public required int Capacity { get; init; }
    [JsonPropertyName("sessions")] public required IReadOnlyList<StreamTraceSessionDto> Sessions { get; init; }
}

public class StreamTraceSessionDto
{
    [JsonPropertyName("sessionId")] public required Guid SessionId { get; init; }
    [JsonPropertyName("path")] public string? Path { get; init; }
    [JsonPropertyName("firstAt")] public required long FirstAt { get; init; }
    [JsonPropertyName("lastAt")] public required long LastAt { get; init; }
    [JsonPropertyName("eventCount")] public required int EventCount { get; init; }
    [JsonPropertyName("lastKind")] public string? LastKind { get; init; }
}
