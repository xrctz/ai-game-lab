#version 330

// Optional lit/fog world shader (GLSL) — for mesh paths using custom materials
in vec3 vertexPosition;
in vec2 vertexTexCoord;
in vec3 vertexNormal;
in vec4 vertexColor;

out vec2 fragTexCoord;
out vec4 fragColor;
out vec3 fragPos;
out vec3 fragNormal;

uniform mat4 mvp;
uniform mat4 matModel;

void main()
{
    fragTexCoord = vertexTexCoord;
    fragColor = vertexColor;
    vec4 world = matModel * vec4(vertexPosition, 1.0);
    fragPos = world.xyz;
    fragNormal = mat3(transpose(inverse(mat3(matModel)))) * vertexNormal;
    gl_Position = mvp * vec4(vertexPosition, 1.0);
}
