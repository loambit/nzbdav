using System.Runtime.InteropServices;

namespace NzbWebDAV.Tests.TestUtils;

public static class RapidYenc
{
    public static readonly bool IsAvailable = Probe();

    private static bool Probe()
    {
        try
        {
            return NativeLibrary.TryLoad("rapidyenc", typeof(RapidYenc).Assembly, null, out _);
        }
        catch
        {
            return false;
        }
    }
}
