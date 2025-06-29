// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
            @location(1) texCoord: vec2f,
        };

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) texCoord: vec2f,
        };

        @vertex fn vs(
            vertex: Vertices
        ) -> VSOutput
        {
            var vsOut: VSOutput;

            vsOut.position = vec4f(vertex.position, 0, 1);
            vsOut.texCoord = vertex.texCoord;

            return vsOut;
        }
    `;
}

export function fragmentShaderSrc()
{
    return /*wgsl*/`
        struct FSInput {
            @builtin(position) position: vec4f,
            @location(0) texCoord: vec2f,
        };

        @group(0) @binding(0) var ourSampler: sampler;
        @group(0) @binding(1) var ourTexture: texture_2d<f32>;

        @fragment fn fs(fsIn: FSInput) -> @location(0) vec4f
        {
            return textureSample(ourTexture, ourSampler, fsIn.texCoord);
        }
    `;
}