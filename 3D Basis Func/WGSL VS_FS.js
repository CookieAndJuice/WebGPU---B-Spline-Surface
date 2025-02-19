// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct VSInput {
            @location(0) position: vec3f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };
        
        struct Uniforms {
            MVP: mat4x4f,
            light: vec3f,
        };
        
        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @vertex fn vs(
            vertex: VSInput
        ) -> VSOutput
        {
            var position = vertex.position;

            var vsOut: VSOutput;
            
            vsOut.position = uniforms.MVP * vec4f(position, 1);
            vsOut.color = vec4f(0, 0.7, 0.7, 1);
            
            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {
            return fsIn.color;
        }
    `;
}