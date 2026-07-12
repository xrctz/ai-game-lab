using System.Numerics;
using System.Text.Json;
using Raylib_cs;

namespace NightOfTheDead;

/// <summary>
/// Multi-language visual pipeline glue:
/// - Textures baked by Python (tools/generate_textures.py)
/// - GLSL post shader (assets/shaders/post.*)
/// - JSON config (assets/visuals.json)
/// Consumed by C# game loop.
/// </summary>
public sealed class VisualAssets : IDisposable
{
    public Texture2D Ground, Brick, Metal, ZombieSkin, Concrete, Glow, Noise;
    public Model MBrick, MConcrete, MMetal, MSkin, MGround;
    public Shader Post;
    public RenderTexture2D SceneTarget;
    public int LocTime, LocDamage, LocContrast, LocVignette;
    public float Contrast = 1.05f;
    public float Vignette = 0.75f;
    public bool PostReady;
    public bool TexturesReady;

    public static string FindAssetsRoot()
    {
        // Prefer cwd (run.sh / dotnet run from project dir), then next to assembly
        string[] candidates =
        [
            Path.Combine(Environment.CurrentDirectory, "assets"),
            Path.Combine(AppContext.BaseDirectory, "assets"),
            Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "assets")),
        ];
        foreach (var c in candidates)
        {
            if (Directory.Exists(c) && File.Exists(Path.Combine(c, "shaders", "post.fs")))
                return c;
        }
        return Path.Combine(Environment.CurrentDirectory, "assets");
    }

    public static VisualAssets Load(int screenW, int screenH)
    {
        var v = new VisualAssets();
        string root = FindAssetsRoot();
        Console.WriteLine($"[visuals] assets root: {root}");

        // JSON config (language: JSON)
        try
        {
            string cfgPath = Path.Combine(root, "visuals.json");
            if (File.Exists(cfgPath))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(cfgPath));
                if (doc.RootElement.TryGetProperty("post", out var post))
                {
                    if (post.TryGetProperty("contrast", out var c)) v.Contrast = c.GetSingle();
                    if (post.TryGetProperty("vignette", out var vg)) v.Vignette = vg.GetSingle();
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[visuals] config: {ex.Message}");
        }

        // Textures (Python-baked PNGs)
        v.Ground = TryTex(Path.Combine(root, "textures", "ground.png"));
        v.Brick = TryTex(Path.Combine(root, "textures", "brick.png"));
        v.Metal = TryTex(Path.Combine(root, "textures", "metal.png"));
        v.ZombieSkin = TryTex(Path.Combine(root, "textures", "zombie_skin.png"));
        v.Concrete = TryTex(Path.Combine(root, "textures", "concrete.png"));
        v.Glow = TryTex(Path.Combine(root, "textures", "glow.png"));
        v.Noise = TryTex(Path.Combine(root, "textures", "noise.png"));
        v.TexturesReady = v.Brick.Id != 0 && v.Ground.Id != 0;

        // Unit cubes with materials
        v.MBrick = MakeTexturedCube(v.Brick);
        v.MConcrete = MakeTexturedCube(v.Concrete);
        v.MMetal = MakeTexturedCube(v.Metal);
        v.MSkin = MakeTexturedCube(v.ZombieSkin);
        v.MGround = MakeTexturedCube(v.Ground);

        // GLSL post shader
        string vs = Path.Combine(root, "shaders", "post.vs");
        string fs = Path.Combine(root, "shaders", "post.fs");
        if (File.Exists(vs) && File.Exists(fs))
        {
            v.Post = Raylib.LoadShader(vs, fs);
            v.LocTime = Raylib.GetShaderLocation(v.Post, "uTime");
            v.LocDamage = Raylib.GetShaderLocation(v.Post, "uDamage");
            v.LocContrast = Raylib.GetShaderLocation(v.Post, "uContrast");
            v.LocVignette = Raylib.GetShaderLocation(v.Post, "uVignette");
            v.PostReady = v.Post.Id != 0;
            Console.WriteLine($"[visuals] post shader ready={v.PostReady}");
        }
        else
        {
            Console.WriteLine("[visuals] post shader files missing");
        }

        v.SceneTarget = Raylib.LoadRenderTexture(screenW, screenH);
        // Bind noise as second texture slot when drawing if supported — Raylib default uses texture0
        return v;
    }

    static Texture2D TryTex(string path)
    {
        if (!File.Exists(path))
        {
            Console.WriteLine($"[visuals] missing texture {path}");
            return default;
        }
        var t = Raylib.LoadTexture(path);
        Raylib.SetTextureFilter(t, TextureFilter.Bilinear);
        Raylib.GenTextureMipmaps(ref t);
        return t;
    }

    static unsafe Model MakeTexturedCube(Texture2D tex)
    {
        Mesh mesh = Raylib.GenMeshCube(1f, 1f, 1f);
        Model model = Raylib.LoadModelFromMesh(mesh);
        if (tex.Id != 0 && model.MaterialCount > 0)
        {
            Raylib.SetMaterialTexture(ref model.Materials[0], MaterialMapIndex.Albedo, tex);
        }
        return model;
    }

    /// <summary>
    /// Unlit bright cubes only. Textured DrawModel uses Raylib's lit shader and
    /// goes pure black with no lights set — that was the "can't see anything" bug.
    /// </summary>
    public void DrawBox(Model model, Vector3 pos, Vector3 size, Color tint)
    {
        Raylib.DrawCube(pos, size.X, size.Y, size.Z, tint);
        Raylib.DrawCubeWires(pos, size.X, size.Y, size.Z,
            new Color((byte)Math.Max(0, tint.R - 40), (byte)Math.Max(0, tint.G - 40),
                (byte)Math.Max(0, tint.B - 40), tint.A));
    }

    public void BeginScene()
    {
        // Direct to backbuffer — no offscreen post crush
        Raylib.BeginDrawing();
        Raylib.ClearBackground(new Color((byte)48, (byte)52, (byte)72, (byte)255));
    }

    public void EndSceneAndPresent(float time, float damage01)
    {
        // Optional very light post only if we want later; currently passthrough end frame
        _ = time;
        _ = damage01;
        Raylib.EndDrawing();
    }

    public void Dispose()
    {
        if (PostReady) Raylib.UnloadShader(Post);
        Raylib.UnloadRenderTexture(SceneTarget);
        UnloadModelSafe(MBrick);
        UnloadModelSafe(MConcrete);
        UnloadModelSafe(MMetal);
        UnloadModelSafe(MSkin);
        UnloadModelSafe(MGround);
        UnloadTex(Ground);
        UnloadTex(Brick);
        UnloadTex(Metal);
        UnloadTex(ZombieSkin);
        UnloadTex(Concrete);
        UnloadTex(Glow);
        UnloadTex(Noise);
    }

    static void UnloadTex(Texture2D t)
    {
        if (t.Id != 0) Raylib.UnloadTexture(t);
    }

    static void UnloadModelSafe(Model m)
    {
        if (m.MeshCount != 0) Raylib.UnloadModel(m);
    }
}
