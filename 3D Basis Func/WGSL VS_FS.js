// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct VSInput {
            @location(0) position: vec4f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec3f,
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
            
            vsOut.position = uniforms.MVP * position;
            vsOut.color = vec3f(0, 0.7, 0.7);
            
            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
            @location(0) color: vec3f,
        };

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {

            var resultColor = vec4f(fsIn.color, 1.0);

            return resultColor;
        }
    `;
}