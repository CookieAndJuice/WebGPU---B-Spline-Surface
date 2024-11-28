// Vertex Shader & Fragment Shader
export function vertexShaderSrc()
{
    return /*wgsl*/`
        struct ControlPoints {
            @location(0) position: vec2f,
        };

        struct SplineVertex {
            @location(1) position: vec2f,
        };

        struct Uniforms {
            vertexSize: f32,
            resolution: vec2f,
        }

        struct VSOutput {
            @builtin(position) position: vec4f,
        };

        @group(0) @binding(0) var<uniform> unif: Uniforms;
        @group(0) @binding(1) var<storage, read> controlPoints: ControlPoints;
        @group(0) @binding(2) var<storage, read> splineVertices: SplineVertex;

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