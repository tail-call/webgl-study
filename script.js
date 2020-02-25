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
            modelViewMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
        };

        this.positionBuffers = [];
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
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    //gl_Position = aVertexPosition;
    //gl_Position += vec4(uProjectionMatrix[1][2] / 4.0, 0, 0, 0);
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
}
`;
    }

    fragmentShaderSource() {
        return `
void main() {
    gl_FragColor = vec4(1.0, 1.0, 0.8, 1.0);
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

    addVertices(vertices) {
        const gl = this.gl;

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.positionBuffers.push(positionBuffer);
    }
}

const screen = new Screen({
    parentElement: document.body,
    width: 640,
    height: 480,
});

screen.addVertices([
    -1,  1,  0,
     1,  1,  0,
    -1, -1, -1,
     1, -1, -1,
]);

screen.addVertices([
    -1,  1, 0,
     1,  1, 0,
    -1, -1, 1,
     1, -1, 1,
]);

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
    screen.clear(0.5, 1.0);

    const gl = screen.gl;

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [-0, 0, -6]);
                                                     //x, y, z
    const xAxis = vec3.create();
    vec3.add(xAxis, xAxis, [1, 0, 0]);

    const zAxis = vec3.create();
    vec3.add(zAxis, zAxis, [0, 0, 1]);

    const factor =  performance.now() / 1000 / Math.PI;

    mat4.rotate(modelViewMatrix, modelViewMatrix, factor * 2, zAxis);
    mat4.rotate(modelViewMatrix, modelViewMatrix, factor * 3, xAxis);
    gl.uniformMatrix4fv(screen.locations.modelViewMatrix, false, modelViewMatrix);

    for (let positionBuffer of screen.positionBuffers) {
        const vertexDimensions = 3;
        const dataType = gl.FLOAT;
        const shouldNormalize = false;
        const stride = 0; // how many bytes to get from one set of values to the next
                          // 0 = use type and numComponents above
        const offset = 0; // how many bytes inside the buffer to start from

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
