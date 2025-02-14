// compute_shader
export function computeShaderSrc(degree, cpsWidthX, cpsHeightY, cpsWidthZ, xResultLength, tempWidth)
{
    return /* wgsl */`
        @group(0) @binding(0)
        var<storage, read> control_points: array<vec3f>;

        @group(0) @binding(1)
        var<storage, read> inputs: array<vec3f>;

        @group(0) @binding(2)
        var<storage, read> intervals: array<vec3u>;

        @group(0) @binding(3)
        var<storage, read_write> output: array<vec3f>;

        @compute @workgroup_size(64)
        fn main(
            @builtin(workgroup_id) workgroup_id : vec3<u32>,
            @builtin(local_invocation_index) local_invocation_index: u32,
            @builtin(num_workgroups) num_workgroups: vec3<u32>)
        {
            let workgroup_index =
                workgroup_id.x +
                workgroup_id.y * num_workgroups.x +
                workgroup_id.z * num_workgroups.x * num_workgroups.y;

            let global_invocation_index =
                workgroup_index * 64 +
                local_invocation_index;
            
            let degree = u32(${degree});
            let cpsWidthX = u32(${cpsWidthX});
            let cpsHeightY = u32(${cpsHeightY});
            let cpsWidthZ = u32(${cpsWidthZ});
            let tempWidth = u32(${tempWidth});
            var xResult: array<vec3f, ${xResultLength}>;
            var zResult: array<vec3f, ${tempWidth}>;
            let index = global_invocation_index;
            
            // De Boor Algorithm Start
            let xInterval = intervals[index].x;
            let yInterval = intervals[index].y;
            let zInterval = intervals[index].z;
            
            // x-axis calculation (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let zOffset = cpsWidthX;                    // z-axis offset
            var yOffset = cpsWidthX * cpsWidthZ;        // y-axis offset
            let xInput = inputs[index].x;
            
            var first = (f32(xInterval) + 1 - xInput) * (f32(xInterval) + 1 - xInput) * (f32(xInterval) + 1 - xInput) / 6;
            var second = ((xInput - f32(xInterval) + 2) * (f32(xInterval) + 1 - xInput) * (f32(xInterval) + 1 - xInput) +
                        (f32(xInterval) + 2 - xInput) * (xInput - f32(xInterval) + 1) * (f32(xInterval) + 1 - xInput) +
                        (f32(xInterval) + 2 - xInput) * (f32(xInterval) + 2 - xInput) * (xInput - f32(xInterval))) / 6;
            var third = ((xInput - f32(xInterval) + 1) * (xInput - f32(xInterval) + 1) * (f32(xInterval) + 1 - xInput) +
                        (xInput - f32(xInterval) + 1) * (f32(xInterval) + 2 - xInput) * (xInput - f32(xInterval)) +
                        (f32(xInterval) + 3 - xInput) * (xInput - f32(xInterval)) * (xInput - f32(xInterval))) / 6;
            var fourth = (xInput - f32(xInterval)) * (xInput - f32(xInterval)) * (xInput - f32(xInterval)) / 6;
            
            // loop {tempWidth} times * {tempWidth} times
            for (var heightY = 0u; heightY < tempWidth; heightY++)
            {
                for (var widthZ = 0u; widthZ < tempWidth; widthZ++)
                {
                    // calculate [iInitial - 1]
                    // [interval - degree + 1] is ?-axis Start Point
                    // y-axis nowPos, z-axis nowpos, x-axis nowPos
                    let nowPos =
                        (heightY + yInterval - degree + 1) * yOffset +
                        (widthZ + zInterval - degree + 1) * zOffset +
                        (xInterval - degree + 1);
                    
                    var xPoint: vec3f;
                    
                    xPoint = first * control_points[nowPos] +
                            second * control_points[nowPos + 1] +
                            third * control_points[nowPos + 2] +
                            fourth * control_points[nowPos + 3];
                    
                    xResult[heightY * tempWidth + widthZ] = xPoint;
                }
            }
            
            // z axis calculation
            yOffset = cpsWidthZ;                    // y-axis offset
            let zInput = inputs[index].z;
            
            // loop {tempWidth} times
            for (var heightY = 0u; heightY < tempWidth; heightY++)
            {
                // iInitial - 1
                // y-axis nowPos, z-axis nowpos, x-axis nowPos
                let nowPos = heightY * tempWidth;
                
                first = (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) / 6;
                second = ((zInput - f32(zInterval) + 2) * (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) +
                        (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval) + 1) * (f32(zInterval) + 1 - zInput) +
                        (f32(zInterval) + 2 - zInput) * (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval))) / 6;
                third = ((zInput - f32(zInterval) + 1) * (zInput - f32(zInterval) + 1) * (f32(zInterval) + 1 - zInput) +
                        (zInput - f32(zInterval) + 1) * (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval)) +
                        (f32(zInterval) + 3 - zInput) * (zInput - f32(zInterval)) * (zInput - f32(zInterval))) / 6;
                fourth = (zInput - f32(zInterval)) * (zInput - f32(zInterval)) * (zInput - f32(zInterval)) / 6;
                
                var zPoint: vec3f;
                zPoint = first * xResult[nowPos] +
                        second * xResult[nowPos + 1] +
                        third * xResult[nowPos + 2] +
                        fourth * xResult[nowPos + 3];
                
                zResult[heightY] = zPoint;
            }
            
            // y axis calculation
            let yInput = inputs[index].y;
            
            first = (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) / 6;
            second = ((yInput - f32(yInterval) + 2) * (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) +
                    (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval) + 1) * (f32(yInterval) + 1 - yInput) +
                    (f32(yInterval) + 2 - yInput) * (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval))) / 6;
            third = ((yInput - f32(yInterval) + 1) * (yInput - f32(yInterval) + 1) * (f32(yInterval) + 1 - yInput) +
                    (yInput - f32(yInterval) + 1) * (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval)) +
                    (f32(yInterval) + 3 - yInput) * (yInput - f32(yInterval)) * (yInput - f32(yInterval))) / 6;
            fourth = (yInput - f32(yInterval)) * (yInput - f32(yInterval)) * (yInput - f32(yInterval)) / 6;
            
            var yPoint: vec3f;
            yPoint = first * zResult[0] +
                    second * zResult[1] +
                    third * zResult[2] +
                    fourth * zResult[3];
            
            output[index] = yPoint;
        }
    `;
}