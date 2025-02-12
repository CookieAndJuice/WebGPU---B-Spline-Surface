// compute_shader
export function computeShaderSrc(degree, cpsWidthX, cpsHeightY, cpsWidthZ, xResultLength, zResultLength, tempWidth)
{
    return /* wgsl */`
        @group(0) @binding(0)
        var<storage, read> control_points: array<vec3f>;

        @group(0) @binding(1)
        var<storage, read> knots: array<u32>;

        @group(0) @binding(2)
        var<storage, read> inputs: array<vec3f>;

        @group(0) @binding(3)
        var<storage, read> intervals: array<vec3u>;

        @group(0) @binding(4)
        var<storage, read_write> output: array<vec3f>;

        @compute @workgroup_size(64)
        fn main(
            @builtin(workgroup_id) workgroup_id : vec3<u32>,
            @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
            @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
            @builtin(local_invocation_index) local_invocation_index: u32,
            @builtin(num_workgroups) num_workgroups: vec3<u32>)
        {
            let workgroup_index =
                workgroup_id.x +
                workgroup_id.y * num_workgroups.x +
                workgroup_id.z * num_workgroups.x * num_workgroups.y;

            let global_invocation_index =
                workgroup_index * (4 * 4 * 5) +
                local_invocation_index;
            
            let degree = u32(${degree});
            let cpsWidthX = u32(${cpsWidthX});
            let cpsHeightY = u32(${cpsHeightY});
            let cpsWidthZ = u32(${cpsWidthZ});
            var xResult: array<vec3f, ${xResultLength}>;
            var zResult: array<vec3f, ${zResultLength}>;
            let index = global_invocation_index;
            
            // De Boor Algorithm Start
            let tempWidth = degree + 1;
            let xInterval = intervals[index].x;
            let yInterval = intervals[index].y;
            let zInterval = intervals[index].z;
            
            // x-axis calculation (계산 순서 : u 하나에 대해 모든 높이 계산 -> 다음 u 계산)
            let zOffset = cpsWidthX;                    // z-axis offset
            let yOffset = cpsWidthX * cpsWidthZ;        // y-axis offset
            
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
                    
                    // 계산값 임시 저장 리스트
                    var tempCps: array<vec3f, ${tempWidth}>;
                    for(var num = 0u; num < tempWidth; num++)
                    {
                        tempCps[num] = control_points[nowPos + num];
                    }
                    
                    // Calculate De Boor Algorithm
                    for (var k = 1u; k < degree + 1; k++)
                    {
                        let iInitial = xInterval - degree + k + 1;
                        var xIntervalIndex = degree;
                        
                        for (var i = xInterval + 1u; i > iInitial - 1u; i--)
                        {
                            let alpha = (inputs[index].x - f32(knots[i - 1])) / f32(knots[i + degree - k] - knots[i - 1]);
                            tempCps[xIntervalIndex] = (1 - alpha) * tempCps[xIntervalIndex - 1] + alpha * tempCps[xIntervalIndex];
                            xIntervalIndex--;
                        }
                    }
                    xResult[index * tempWidth * tempWidth + heightY * tempWidth + widthZ] = tempCps[degree];
                }
            }
            
            // z axis calculation
            // loop {tempWidth} times
            for (var heightY = 0u; heightY < tempWidth; heightY++)
            {
                // iInitial - 1
                // y-axis nowPos, z-axis nowpos, x-axis nowPos
                let nowPos = index * tempWidth * tempWidth + heightY * tempWidth;
                
                // 계산값 임시 저장 리스트
                var tempCps: array<vec3f, ${tempWidth}>;
                for(var num = 0u; num < tempWidth; num++)
                {
                    tempCps[num] = xResult[nowPos + num];
                }
                
                // Calculate De Boor Algorithm
                for (var k = 1u; k < degree + 1; k++)
                {
                    let iInitial = zInterval - degree + k + 1;
                    var zIntervalIndex = degree;
                    
                    for (var i = zInterval + 1u; i > iInitial - 1u; i--)
                    {
                        let alpha = (inputs[index].x - f32(knots[i - 1])) / f32(knots[i + degree - k] - knots[i - 1]);
                        tempCps[zIntervalIndex] = (1 - alpha) * tempCps[zIntervalIndex - 1] + alpha * tempCps[zIntervalIndex];
                        zIntervalIndex--;
                    }
                }
                zResult[index * tempWidth + heightY] = tempCps[degree];
            }
            
            // y axis calculation
            let nowPos = index * tempWidth;               // 계산값 임시 저장 리스트
            var yTempCps: array<vec3f, ${tempWidth}>;
            for(var num = 0u; num < tempWidth; num++)
            {
                yTempCps[num] = zResult[nowPos + num];
            }
            
            for (var k = 1u; k < degree + 1; k++)
            {
                let iInitial = yInterval - degree + k + 1;
                var yIntervalIndex = degree;
                
                for (var i = yInterval + 1u; i > iInitial - 1u; i--)
                {
                    let alpha = (inputs[index].y - f32(knots[i - 1])) / f32(knots[i + degree - k] - knots[i - 1]);
                    yTempCps[yIntervalIndex] = (1 - alpha) * yTempCps[yIntervalIndex - 1] + alpha * yTempCps[yIntervalIndex];
                    yIntervalIndex--;
                }
            }
            output[index] = yTempCps[degree];
        }
    `;
}