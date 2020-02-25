class Screen {
    constructor({ parentElement, width, height }) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const gl = canvas.getContext('webgl');
        parentElement.appendChild(canvas);

        Object.assign(this, {
            canvas,
            gl,
            parentElement,
        });

        this.shaderProgram = this.loadShaderProgram();
        gl.useProgram(this.shaderProgram);

        this.locations = {
            vertexPosition: this.gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
            vertexColor: this.gl.getAttribLocation(this.shaderProgram, 'aVertexColor'),
            modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
        };

        this.models = [];
    }

    clear(red = 0, green = 0, blue = 0) {
        const gl = this.gl;
        gl.clearColor(red, green, blue, 0.9);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    vertexShaderSource() {
        return `
attribute vec4 aVertexPosition;
attribute vec4 aVertexColor;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

varying lowp vec4 vColor;

void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;
}
`;
    }

    fragmentShaderSource() {
        return `
varying lowp vec4 vColor;

void main() {
    gl_FragColor = vColor;
}
`;
    }

    loadShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const infoLog = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compile failed: ' + infoLog);
        }

        return shader;
    }

    loadShaderProgram() {
        const gl = this.gl;
        const vertexShader = this.loadShader(gl.VERTEX_SHADER, this.vertexShaderSource());
        const fragmentShader = this.loadShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource());

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const infoLog = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Shader program link failed: ' + gl.getProgramInfoLog(program));
        }

        return program;
    }

    addModel({ vertices, colors }) {
        const gl = this.gl;

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        this.models.push({
            positionBuffer,
            colorBuffer,
        });
    }
}

const screen = new Screen({
    parentElement: document.body,
    width: 640,
    height: 480,
});

screen.addModel({ vertices: [
    -1,  1,  0,
     1,  1,  0,
    -1, -1, -1,
     1, -1, -1,
], colors: [
    1,1,1,1,
    1,1,0,1,
    1,0,1,1,
    0,1,1,1,
]});

screen.addModel({ vertices: [
    -1,  1, 0,
     1,  1, 0,
    -1, -1, 1,
     1, -1, 1,
], colors: [
    1,1,1,1,
    1,0,0,1,
    0,0,1,1,
    0,1,0,1,
]});

function projectionMatrix({ fieldOfView, aspectRatio, zNear, zFar }) {
    const projectionMatrix = mat4.create();
    return mat4.perspective(
        projectionMatrix,
        (fieldOfView / 180) * Math.PI,
        aspectRatio,
        zNear,
        zFar
    );
}

function draw(screen) {
    screen.clear(0.2, 0.6, 0.3);

    const gl = screen.gl;

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0, 0, -6]);
                                                     //x, y, z
    const xAxis = vec3.create();
    vec3.add(xAxis, xAxis, [1, 0, 0]);

    const zAxis = vec3.create();
    vec3.add(zAxis, zAxis, [0, 0, 1]);

    const factor = performance.now() / 1000 / Math.PI;

    mat4.rotate(modelViewMatrix, modelViewMatrix, factor * 2, zAxis);
    mat4.rotate(modelViewMatrix, modelViewMatrix, factor * 3, xAxis);
    gl.uniformMatrix4fv(screen.locations.modelViewMatrix, false, modelViewMatrix);

    for (let { positionBuffer, colorBuffer } of screen.models) {
        const stride = 0; // how many bytes to get from one set of values to the next
                          // 0 = use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from
        const shouldNormalize = false;

        {
            const vertexDimensions = 3;
            const dataType = gl.FLOAT;

            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.vertexAttribPointer(
                screen.locations.vertexPosition,
                vertexDimensions,
                dataType,
                shouldNormalize,
                stride,
                offset
            );
            gl.enableVertexAttribArray(screen.locations.vertexPosition);
        }

        {
            const colorDimensions = 4;
            const dataType = gl.FLOAT;

            gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
            gl.vertexAttribPointer(
                screen.locations.vertexColor,
                colorDimensions,
                dataType,
                shouldNormalize,
                stride,
                offset
            );
            gl.enableVertexAttribArray(screen.locations.vertexColor);
        }

        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    }

    requestAnimationFrame(() => draw(screen));
}

{
    const gl = screen.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.uniformMatrix4fv(screen.locations.projectionMatrix, false, projectionMatrix({
        fieldOfView: 45,
        aspectRatio: screen.canvas.clientWidth / screen.canvas.clientHeight,
        zNear: 0.1,
        zFar: 100,
    }));
}

draw(screen);
