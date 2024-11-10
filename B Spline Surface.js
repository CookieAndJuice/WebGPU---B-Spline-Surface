import { vertexShaderSrc } from './WGSL VS_FS.js';
import { fragmentShaderSrc } from './WGSL VS_FS.js';
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
    const adapter = await navigator.gpu?.requestAdapter();
    const device = await device?.requestDevice();
    if (!device)
    {
        fail('need a browser that supports Webgpu');
        return;
    }
    
    // screen setting
    const screenWidth = 2560;
    const screenHeight = 1440;

    // basic setting
    const cpsWidth = 10;
    const cpsHeight = 10;
    const diff = screenHeight / 5;

    const minW = parseInt(screenWidth / 2 - (diff * 3 / 2));
    const maxW = minW + diff * 3;
    const minH = parseInt(screenHeight / 2 - (diff * 3 / 2));
    const maxH = minH + diff * 3;
    
    const h = diff * 3 / (cpsWidth - 1);

    // control points
    const cps_size = cpsWidth * cpsHeight * 2 * 4;      // cps numbers * vec2 * 4bytes
    const cpsTypedArray = new Int32Array(cps_size);
    for (let v = 0; v < cpsHeight; ++v)
    {
        for (let u = 0; u < cpsWidth; ++u)
        {
            cpsTypedArray.set([minW + u * h, minH + v * h]);
        }
    }
    
    // degree
    const degree = 3;
    
    // knots
    const knotNumbers = cpsWidth + degree - 1;
    const knotArray = [];
    for (let i = 0; i < knotNumbers; ++i)
    {
        knotArray[i] = i;
    }
    const knotTypedArray = new Uint32Array(knotArray);
    
    // calculate domain knots
    const start = degree - 1;                   // domain start point
    const end = knotTypedArray.length - degree;       // domain end point
    const domainNum = end - start + 1;          // domain knots number
    
    // draw points
    const dTheta = 12;
    const drawPointsNum = 360 / dTheta;
    const uDrawArray = [];
    const vDrawArray = [];
    let theta = 0;
    
    for (let i = 0; i < drawPointsNum; ++i)
    {
        theta = i * dTheta;
        
        uDrawArray[i] = Number(500 + 400 * Math.cos(theta * Math.PI / 180)) / 1000 * (domainNum - 1) + start;
        vDrawArray[i] = Number(500 + 400 * Math.sin(theta * Math.PI / 180)) / 1000 * (domainNum - 1) + start;
    }
    const uDrawTypedArray = new Float32Array(uDrawArray);
    const vDrawTypedArray = new Float32Array(vDrawArray);
    
    // interval TypedArrays
    const uIntervalArray = [];
    const vIntervalArray = [];
    let interval = 0;
    for (let i = 0; i < drawPointsNum; ++i)
    {
        if (uDrawArray[i] == knotArray[end])
            interval = end - 1;
        else
            interval = findInterval(knotArray, uDrawArray[i]);
        uIntervalArray[i] = interval;
        
        if (vDrawArray[i] == knotArray[end])
            interval = end - 1;
        else
            interval = findInterval(knotArray, vDrawArray[i]);
        vIntervalArray[i] = interval;
    }
    const uIntervalTypedArray = new Uint32Array(uIntervalArray);
    const vIntervalTypedArray = new Uint32Array(vIntervalArray);
    
    // uResult & tempCps size
    const uResultLength = uDrawTypedArray.length * cpsHeight;
    const output_U_V_Offset = uDrawTypedArray.length;
    const tempWidth = degree + 1;
    
    // shader
    const computeShaderModule = device.createShaderModule({
        label: 'B Spline Surface Compute Module',
        code: computeShaderSrc(degree, cpsWidth, cpsHeight, uResultLength, tempWidth),
    });

    // pipeline
    const computePipeline = device.createComputePipeline({
        label: 'B Spline Surface Compute Pipeline',
        layout: auto,
        compute: {
            computeShaderModule,
        },
    });

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