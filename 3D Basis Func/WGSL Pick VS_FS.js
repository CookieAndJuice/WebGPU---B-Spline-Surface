// Vertex Shader & Fragment Shader
export function ShaderIdSrc(sizeRatio) {
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec3f,
            @location(1) id: f32,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @group(0) @binding(0) var<uniform> uniformMVP: mat4x4f;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            var centerPoint = vertex.position;

            var vsOut: VSOutput;
            var sizeRatio = vec3f(${sizeRatio.x}f, ${sizeRatio.y}f, ${sizeRatio.z}f);

            var tempPosition = uniformMVP * vec4f(centerPoint, 1);
            centerPoint = tempPosition.xyz;
            
            vsOut.position = vec4f(centerPoint / sizeRatio, 1);
            vsOut.color = vec4f(vec3(vertex.id), 1);
            
            return vsOut;
        }
        
        @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f
        {
            return fsInput.color;
        }
    `;
}