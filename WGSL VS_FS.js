// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct Vertex {
            @location(0) position: vec2f,
            @location(1) size: f32,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
        };

        @vertex fn vs() -> VSOutput
        {


            var vsOut: VSOutput;


            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
        }

        @fragment fn fs(fsIn: FSInput) -> FSInput
        {
            return vec4f(0.5, 0.5, 1, 1);
        }
    `;
}