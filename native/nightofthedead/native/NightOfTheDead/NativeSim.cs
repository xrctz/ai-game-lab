using System.Runtime.InteropServices;

namespace NightOfTheDead;

/// <summary>
/// P/Invoke bridge to the Rust simulation crate <c>libnotd_sim.so</c>.
/// Build: <c>cargo build --release</c> in <c>native/rust_sim</c>.
/// </summary>
public static class NativeSim
{
    public const string LibName = "notd_sim";

    /// <summary>Must match Rust <c>ZombieState</c> field order exactly.</summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct NativeZombie
    {
        public float X, Y, Z;
        public float Hp, MaxHp, Speed;
        public float AttackCd, Bob, DieT, Yaw;
        public int Dead;
        public int Variant;
    }

    static bool _tried;
    static bool _ok;

    public static bool Available
    {
        get
        {
            if (_tried) return _ok;
            _tried = true;
            try
            {
                _ok = notd_sim_ping() == 1;
                if (_ok)
                {
                    var ver = Marshal.PtrToStringAnsi(notd_sim_version()) ?? "?";
                    Console.WriteLine($"[rust] loaded {ver}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[rust] not loaded: {ex.Message}");
                _ok = false;
            }
            return _ok;
        }
    }

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int notd_sim_ping();

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr notd_sim_version();

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int notd_pick_target(
        [In] NativeZombie[] zombies,
        int count,
        float camX, float camY, float camZ,
        float lookX, float lookY, float lookZ);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int notd_update_zombies(
        [In, Out] NativeZombie[] zombies,
        int count,
        float playerX, float playerY, float playerZ,
        float dt,
        int wave,
        out float outPlayerDamage);

    [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
    public static extern int notd_apply_hit(
        [In, Out] NativeZombie[] zombies,
        int count,
        int index,
        float damage,
        int headshot);
}
