import { computeShaderSrc } from './WGSL Compute Shader.js';

async function main() {
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