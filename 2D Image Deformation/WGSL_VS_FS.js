// Vertex Shader & Fragment Shader
export function vertexShaderSrc(aspect, resolution, controlPointsNum)
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec2f,
            @location(1) color: vec4f,
        };
    
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @vertex fn vs(
            @builtin(instance_index) instanceIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            var centerPoint = vertex.position;
            let aspect = ${aspect}f;

            var vsOut: VSOutput;
            var resolution = vec2f(${resolution.x}f, ${resolution.y}f);

            vsOut.position = vec4f(centerPoint, 0, 1);
            vsOut.color = vertex.color;
            
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