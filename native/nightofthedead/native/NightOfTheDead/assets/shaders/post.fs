#version 330

// Gentle night grade — readable, not eye-crushing
in vec2 fragTexCoord;
in vec4 fragColor;

uniform sampler2D texture0;
uniform sampler2D texture1;
uniform float uTime;
uniform float uDamage;
uniform float uContrast;
uniform float uVignette;

out vec4 finalColor;

void main()
{
    vec2 uv = fragTexCoord;
    vec3 col = texture(texture0, uv).rgb;

    // Lift blacks so night stays visible
    col = col * 1.15 + vec3(0.04);
    col = pow(col, vec3(0.92)); // slight gamma up

    // Soft contrast (around mid-gray)
    col = (col - 0.5) * uContrast + 0.5;

    // Very light cool grade (not a blue crush)
    col.b = min(1.0, col.b * 1.03);

    // Tiny grain only
    float n = texture(texture1, uv * 2.5 + vec2(uTime * 0.05)).r;
    col += (n - 0.5) * 0.02;

    // Soft vignette (uVignette ~ 0.6–1.0 recommended)
    vec2 vc = uv - 0.5;
    float vig = 1.0 - dot(vc, vc) * uVignette;
    col *= clamp(vig, 0.55, 1.0);

    // Damage tint
    col = mix(col, col * vec3(1.25, 0.55, 0.5), clamp(uDamage, 0.0, 1.0) * 0.45);

    finalColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
