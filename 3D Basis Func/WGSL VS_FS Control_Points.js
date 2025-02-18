// Vertex Shader & Fragment Shader
export function vertexShaderSrc(aspect, sizeRatio, controlPointsNum)
{
    return /*wgsl*/`
        struct Vertices {
            @location(0) position: vec3f,
        };
    
        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        };

        @vertex fn vs(
            @builtin(vertex_index) vIndex: u32,
            @builtin(instance_index) instanceIndex: u32,
            vertex: Vertices
        ) -> VSOutput
        {
            var centerPoint = vertex.position;

            var vsOut: VSOutput;
            var sizeRatio = vec3f(${sizeRatio.x}f, ${sizeRatio.y}f, ${sizeRatio.z}f);
            
            vsOut.position = vec4f(centerPoint / sizeRatio, 1);
            if (${controlPointsNum} <= instanceIndex)
            {
                vsOut.color = vec4f(0, 0, 0, 1);
            }
            else
            {
                vsOut.color = vec4f(0, 0.7, 0.7, 1);
            }
            
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