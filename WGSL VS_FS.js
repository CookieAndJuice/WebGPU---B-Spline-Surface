// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct Vertex {
            @location(0) position: vec2f,
        };

        struct Uniforms {
            vertexSize: f32,
            resolution: vec2f,
        }

        struct VSOutput {
            @builtin(position) position: vec4f,
        };

        @group(0) @binding(0) var<uniform> unif: Uniforms;
        @group(0) @binding(1) var<storage, read> vert: Vertex;

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
        ) -> VSOutput
        {
            var vsOut: VSOutput;
            vsOut.position = vec4f(vert.position + unif.size / unif.resolution, 0, 1);

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
            return vec4f(0.5, 0.5, 0.5, 1);
        }
    `;
}