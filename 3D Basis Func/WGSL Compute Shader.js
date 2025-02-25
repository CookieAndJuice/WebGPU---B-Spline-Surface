// compute_shader
export function computeShaderSrc(degree, cpsWidthX, cpsWidthY, cpsHeightZ, xResultLength, tempWidth, start, end)
{
    return /* wgsl */`
        @group(0) @binding(0)
        var<storage, read> control_points: array<vec4f>;

        @group(0) @binding(1)
        var<storage, read> inputs: array<vec4f>;

        @group(0) @binding(2)
        var<storage, read> intervals: array<vec4u>;

        @group(0) @binding(3)
        var<storage, read_write> output: array<vec4f>;

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
            let cpsWidthY = u32(${cpsWidthY});
            let cpsHeightZ = u32(${cpsHeightZ});
            let tempWidth = u32(${tempWidth});
            var xResult: array<vec4f, ${xResultLength}>;
            var yResult: array<vec4f, ${tempWidth}>;
            let index = global_invocation_index;
            
            // De Boor Algorithm Start
            let xInterval = intervals[index].x;
            let yInterval = intervals[index].y;
            let zInterval = intervals[index].z;
            
            // x-axis calculation (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let yOffset = cpsWidthX;                    // y-axis offset
            var zOffset = cpsWidthX * cpsWidthY;        // z-axis offset
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
            for (var heightZ = 0u; heightZ < tempWidth; heightZ++)
            {
                for (var widthY = 0u; widthY < tempWidth; widthY++)
                {                    
                    // calculate [iInitial - 1]
                    // [interval - degree + 1] is ?-axis Start Point
                    // z-axis nowpos, y-axis nowPos, x-axis nowPos
                    let nowPos =
                        (heightZ + zInterval - degree + 1) * zOffset +
                        (widthY + yInterval - degree + 1) * yOffset +
                        (xInterval - degree + 1);
                    
                    var xPoint: vec4f;
                    
                    xPoint = first * control_points[nowPos] +
                            second * control_points[nowPos + 1] +
                            third * control_points[nowPos + 2] +
                            fourth * control_points[nowPos + 3];
                    
                    xResult[heightZ * tempWidth + widthY] = xPoint;
                }
            }
            
            // y axis calculation
            let yInput = inputs[index].y;
            let start = f32(${start});
            let end = f32(${end});
            let domainNum = end - start + 1;
            
            first = (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) / 6;
            second = ((yInput - f32(yInterval) + 2) * (f32(yInterval) + 1 - yInput) * (f32(yInterval) + 1 - yInput) +
                    (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval) + 1) * (f32(yInterval) + 1 - yInput) +
                    (f32(yInterval) + 2 - yInput) * (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval))) / 6;
            third = ((yInput - f32(yInterval) + 1) * (yInput - f32(yInterval) + 1) * (f32(yInterval) + 1 - yInput) +
                    (yInput - f32(yInterval) + 1) * (f32(yInterval) + 2 - yInput) * (yInput - f32(yInterval)) +
                    (f32(yInterval) + 3 - yInput) * (yInput - f32(yInterval)) * (yInput - f32(yInterval))) / 6;
            fourth = (yInput - f32(yInterval)) * (yInput - f32(yInterval)) * (yInput - f32(yInterval)) / 6;

            // loop {tempWidth} times
            for (var heightZ = 0u; heightZ < tempWidth; heightZ++)
            {
                // iInitial - 1
                // z-axis nowpos, y-axis nowPos, x-axis nowPos
                let nowPos = heightZ * tempWidth;
                
                var yPoint: vec4f;
                yPoint = first * xResult[nowPos] +
                        second * xResult[nowPos + 1] +
                        third * xResult[nowPos + 2] +
                        fourth * xResult[nowPos + 3];
                
                yResult[heightZ] = yPoint;
            }
            
            // z axis calculation
            let zInput = inputs[index].z;
            
            first = (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) / 6;
            second = ((zInput - f32(zInterval) + 2) * (f32(zInterval) + 1 - zInput) * (f32(zInterval) + 1 - zInput) +
                    (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval) + 1) * (f32(zInterval) + 1 - zInput) +
                    (f32(zInterval) + 2 - zInput) * (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval))) / 6;
            third = ((zInput - f32(zInterval) + 1) * (zInput - f32(zInterval) + 1) * (f32(zInterval) + 1 - zInput) +
                    (zInput - f32(zInterval) + 1) * (f32(zInterval) + 2 - zInput) * (zInput - f32(zInterval)) +
                    (f32(zInterval) + 3 - zInput) * (zInput - f32(zInterval)) * (zInput - f32(zInterval))) / 6;
            fourth = (zInput - f32(zInterval)) * (zInput - f32(zInterval)) * (zInput - f32(zInterval)) / 6;
            
            var zPoint: vec4f;
            zPoint = first * yResult[0] +
                    second * yResult[1] +
                    third * yResult[2] +
                    fourth * yResult[3];

            // output[index] = (zPoint - start) / (domainNum - 1) * 2 - 1;
            zPoint.w = 1;
            output[index] = zPoint;
        }
    `;
}