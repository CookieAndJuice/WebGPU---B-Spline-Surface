import { computeShaderSrc } from './WGSL Compute Shader.js';

function findInterval(knotList, point) {
    let returnIndex = 0;
    let floorPoint = Math.floor(point);

    for (let i = 0; i < knotList.length; ++i) {
        if (floorPoint == knotList[i])
            returnIndex = i;
    }

    return returnIndex;
}

async function main() {
    // screen setting
    const screenWidth = 2560;
    const screenHeight = 1440;
    
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await device?.requestDevice();
    if (!device)
    {
        fail('need a browser that supports Webgpu');
        return;
    }

    const computeShaderModule = device.createShaderModule({
        label: 'B Spline Surface Compute Module',
        code: computeShaderSrc(),
    });

    const computePipeline = device.createComputePipeline({
        label: 'B Spline Surface Compute Pipeline',
        layout: auto,
        compute: {
            computeShaderModule,
        },
    });
    
    // datas
    const cpsWidth = 5;
    const cpsHeight = 5;
    const interval = screenHeight / 5;

    const minW = parseInt(screenWidth / 2 - (interval * 3 / 2));
    const maxW = minW + interval * 3;
    const minH = parseInt(screenHeight / 2 - (interval * 3 / 2));
    const maxH = minH + interval * 3;
    
    const h = interval * 3 / (cpsWidth - 1);

    // control points
    
    
    // degree
    
    
    // knots
    
    
    // calculate domain knots
    
    
    // draw points
    
    
    // interval lists
    
    
    // uResult & tempCps size
    
    
    // buffers
    const uInputs = device.createBuffer({
        label: 'uInputs buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const vInputs = device.createBuffer({
        label: 'vInputs buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const control_points = device.createBuffer({
        label: 'control_points buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const knots = device.createBuffer({
        label: 'knots buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const uIntervals = device.createBuffer({
        label: 'uIntervals buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const vIntervals = device.createBuffer({
        label: 'vIntervals buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const output = device.createBuffer({
        label: 'output buffer',
        size: 1,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
}
main();