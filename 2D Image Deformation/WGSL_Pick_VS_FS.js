// Vertex Shader & Fragment Shader
export function ShaderIdSrc()
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
            @location(1) id: f32,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @group(0) @binding(0) var<uniform> uniformMVP: mat3x3f;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            var centerPoint = vertex.position;
            let boxPos = points[vIndex];

            var vsOut: VSOutput;

            var tempPosition = uniformMVP * vec3f(centerPoint, 1);
            centerPoint = tempPosition.xy;
            
            vsOut.position = vec4f(centerPoint + boxPos, 0, 1);
            vsOut.color = vec4f(vec3(vertex.id), 1);
            
            return vsOut;
        }
        
        @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f
        {
            return fsInput.color;
        }
    `;
}