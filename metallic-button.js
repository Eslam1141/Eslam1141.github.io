/* metallic-button.js — vanilla WebGL2 port of the shadcn "metallic button"
 * shader (react component -> plain DOM). Progressively enhances an existing
 * <button> with a liquid-metal sheen behind it; the button keeps working
 * with zero visual change if WebGL2 or reduced-motion rules it out. The
 * shader canvas lives in a sibling wrapper, never inside the button itself,
 * so app.js code that does `btn.textContent = "..."` can't wipe it out.
 */
(function () {
  "use strict";

  var VERTEX_SHADER = "#version 300 es\n" +
    "precision mediump float;\n" +
    "layout(location = 0) in vec4 a_position;\n" +
    "uniform vec2 u_resolution;\n" +
    "uniform float u_pixelRatio;\n" +
    "uniform float u_originX;\n" +
    "uniform float u_originY;\n" +
    "uniform float u_worldWidth;\n" +
    "uniform float u_worldHeight;\n" +
    "uniform float u_fit;\n" +
    "uniform float u_scale;\n" +
    "uniform float u_rotation;\n" +
    "uniform float u_offsetX;\n" +
    "uniform float u_offsetY;\n" +
    "out vec2 v_objectUV;\n" +
    "out vec2 v_responsiveUV;\n" +
    "out vec2 v_responsiveBoxGivenSize;\n" +
    "vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {\n" +
    "  vec2 box = vec2(0.);\n" +
    "  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);\n" +
    "  float noFitBoxWidth = box.x;\n" +
    "  if (u_fit == 1.) {\n" +
    "    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);\n" +
    "  } else if (u_fit == 2.) {\n" +
    "    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);\n" +
    "  }\n" +
    "  box.y = box.x / boxRatio;\n" +
    "  return vec3(box, noFitBoxWidth);\n" +
    "}\n" +
    "void main() {\n" +
    "  gl_Position = a_position;\n" +
    "  vec2 uv = gl_Position.xy * .5;\n" +
    "  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);\n" +
    "  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);\n" +
    "  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;\n" +
    "  float r = u_rotation * 3.14159265358979323846 / 180.;\n" +
    "  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));\n" +
    "  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);\n" +
    "  float fixedRatio = 1.;\n" +
    "  vec2 fixedRatioBoxGivenSize = vec2(\n" +
    "  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,\n" +
    "  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y\n" +
    "  );\n" +
    "  vec2 objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;\n" +
    "  vec2 objectWorldScale = u_resolution.xy / objectBoxSize;\n" +
    "  v_objectUV = uv;\n" +
    "  v_objectUV *= objectWorldScale;\n" +
    "  v_objectUV += boxOrigin * (objectWorldScale - 1.);\n" +
    "  v_objectUV += graphicOffset;\n" +
    "  v_objectUV /= u_scale;\n" +
    "  v_objectUV = graphicRotation * v_objectUV;\n" +
    "  v_responsiveBoxGivenSize = vec2(\n" +
    "  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,\n" +
    "  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y\n" +
    "  );\n" +
    "  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;\n" +
    "  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;\n" +
    "  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;\n" +
    "  v_responsiveUV = uv;\n" +
    "  v_responsiveUV *= responsiveBoxScale;\n" +
    "  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);\n" +
    "  v_responsiveUV += graphicOffset;\n" +
    "  v_responsiveUV /= u_scale;\n" +
    "  v_responsiveUV.x *= responsiveRatio;\n" +
    "  v_responsiveUV = graphicRotation * v_responsiveUV;\n" +
    "  v_responsiveUV.x /= responsiveRatio;\n" +
    "}";

  var FRAGMENT_SHADER = "#version 300 es\n" +
    "precision mediump float;\n" +
    "uniform vec2 u_resolution;\n" +
    "uniform float u_time;\n" +
    "uniform vec4 u_colorBack;\n" +
    "uniform vec4 u_colorTint;\n" +
    "uniform float u_softness;\n" +
    "uniform float u_repetition;\n" +
    "uniform float u_shiftRed;\n" +
    "uniform float u_shiftBlue;\n" +
    "uniform float u_distortion;\n" +
    "uniform float u_contour;\n" +
    "uniform float u_angle;\n" +
    "in vec2 v_objectUV;\n" +
    "in vec2 v_responsiveUV;\n" +
    "in vec2 v_responsiveBoxGivenSize;\n" +
    "out vec4 fragColor;\n" +
    "#define TWO_PI 6.28318530718\n" +
    "#define PI 3.14159265358979323846\n" +
    "vec2 rotate(vec2 uv, float th) {\n" +
    "  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;\n" +
    "}\n" +
    "vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }\n" +
    "float snoise(vec2 v) {\n" +
    "  const vec4 C = vec4(0.211324865405187, 0.366025403784439,\n" +
    "    -0.577350269189626, 0.024390243902439);\n" +
    "  vec2 i = floor(v + dot(v, C.yy));\n" +
    "  vec2 x0 = v - i + dot(i, C.xx);\n" +
    "  vec2 i1;\n" +
    "  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);\n" +
    "  vec4 x12 = x0.xyxy + C.xxzz;\n" +
    "  x12.xy -= i1;\n" +
    "  i = mod(i, 289.0);\n" +
    "  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))\n" +
    "    + i.x + vec3(0.0, i1.x, 1.0));\n" +
    "  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),\n" +
    "      dot(x12.zw, x12.zw)), 0.0);\n" +
    "  m = m * m;\n" +
    "  m = m * m;\n" +
    "  vec3 x = 2.0 * fract(p * C.www) - 1.0;\n" +
    "  vec3 h = abs(x) - 0.5;\n" +
    "  vec3 ox = floor(x + 0.5);\n" +
    "  vec3 a0 = x - ox;\n" +
    "  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);\n" +
    "  vec3 g;\n" +
    "  g.x = a0.x * x0.x + h.x * x0.y;\n" +
    "  g.yz = a0.yz * x12.xz + h.yz * x12.yw;\n" +
    "  return 130.0 * dot(m, g);\n" +
    "}\n" +
    "float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {\n" +
    "  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));\n" +
    "  float border = w[0];\n" +
    "  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));\n" +
    "  border = w[0] + .4 * (1. - bump) * w[1];\n" +
    "  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));\n" +
    "  border = w[0] + .5 * (1. - bump) * w[1];\n" +
    "  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));\n" +
    "  border = w[0] + w[1];\n" +
    "  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));\n" +
    "  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];\n" +
    "  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));\n" +
    "  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));\n" +
    "  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);\n" +
    "  return ch;\n" +
    "}\n" +
    "void main() {\n" +
    "  const float firstFrameOffset = 2.8;\n" +
    "  float t = .3 * (u_time + firstFrameOffset);\n" +
    "  vec2 uv = v_objectUV + .5;\n" +
    "  uv.y = 1. - uv.y;\n" +
    "  float cycleWidth = u_repetition;\n" +
    "  float edge = 0.;\n" +
    "  vec2 rotatedUV = uv - vec2(.5);\n" +
    "  float angle = (-u_angle + 70.) * PI / 180.;\n" +
    "  float cosA = cos(angle);\n" +
    "  float sinA = sin(angle);\n" +
    "  rotatedUV = vec2(\n" +
    "  rotatedUV.x * cosA - rotatedUV.y * sinA,\n" +
    "  rotatedUV.x * sinA + rotatedUV.y * cosA\n" +
    "  ) + vec2(.5);\n" +
    "  vec2 shapeUV = uv - .5;\n" +
    "  shapeUV *= .67;\n" +
    "  edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);\n" +
    "  edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));\n" +
    "  float opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);\n" +
    "  edge = 1.2 * edge;\n" +
    "  float diagBLtoTR = rotatedUV.x - rotatedUV.y;\n" +
    "  float diagTLtoBR = rotatedUV.x + rotatedUV.y;\n" +
    "  vec3 color = vec3(0.);\n" +
    "  vec3 color1 = vec3(.98, 0.98, 1.);\n" +
    "  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));\n" +
    "  vec2 grad_uv = uv - .5;\n" +
    "  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));\n" +
    "  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);\n" +
    "  float direction = grad_uv.x;\n" +
    "  float bump = pow(1.8 * dist, 1.2);\n" +
    "  bump = 1. - bump;\n" +
    "  bump *= pow(uv.y, .3);\n" +
    "  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);\n" +
    "  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);\n" +
    "  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);\n" +
    "  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;\n" +
    "  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;\n" +
    "  float noise = snoise(uv - t);\n" +
    "  edge += (1. - edge) * u_distortion * noise;\n" +
    "  direction += diagBLtoTR;\n" +
    "  float contour = 0.;\n" +
    "  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));\n" +
    "  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));\n" +
    "  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);\n" +
    "  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));\n" +
    "  bump *= clamp(pow(uv.y, .1), .3, 1.);\n" +
    "  direction *= (.1 + (1.1 - edge) * bump);\n" +
    "  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));\n" +
    "  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));\n" +
    "  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));\n" +
    "  direction *= (.5 + .5 * pow(uv.y, 2.));\n" +
    "  direction *= cycleWidth;\n" +
    "  direction -= t;\n" +
    "  float colorDispersion = (1. - bump);\n" +
    "  colorDispersion = clamp(colorDispersion, 0., 1.);\n" +
    "  float dispersionRed = colorDispersion;\n" +
    "  dispersionRed += .03 * bump * noise;\n" +
    "  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));\n" +
    "  dispersionRed -= diagBLtoTR;\n" +
    "  float dispersionBlue = colorDispersion;\n" +
    "  dispersionBlue *= 1.3;\n" +
    "  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));\n" +
    "  dispersionBlue -= .2 * edge;\n" +
    "  dispersionRed *= (u_shiftRed / 20.);\n" +
    "  dispersionBlue *= (u_shiftBlue / 20.);\n" +
    "  float blur = u_softness / 15. + .3 * contour;\n" +
    "  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);\n" +
    "  w[1] -= .02 * smoothstep(.0, 1., edge + bump);\n" +
    "  float stripe_r = fract(direction + dispersionRed);\n" +
    "  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r), bump, u_colorTint.r);\n" +
    "  float stripe_g = fract(direction);\n" +
    "  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g), bump, u_colorTint.g);\n" +
    "  float stripe_b = fract(direction - dispersionBlue);\n" +
    "  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);\n" +
    "  color = vec3(r, g, b);\n" +
    "  color *= opacity;\n" +
    "  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;\n" +
    "  color = color + bgColor * (1. - opacity);\n" +
    "  opacity = opacity + u_colorBack.a * (1. - opacity);\n" +
    "  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);\n" +
    "  fragColor = vec4(color, opacity);\n" +
    "}";

  var DEFAULT_MIN_PIXEL_RATIO = 2;
  var DEFAULT_MAX_PIXEL_COUNT = 1920 * 1080 * 4;

  function parseColor(value) {
    var fallback = [1, 1, 1, 1];
    if (typeof value !== "string") return fallback;
    var hex = value.trim().replace("#", "");
    if (hex.length === 3) {
      hex = hex.split("").map(function (c) { return c + c; }).join("");
    }
    if (hex.length === 6) hex += "ff";
    if (hex.length !== 8) return fallback;
    var int = parseInt(hex, 16);
    if (isNaN(int)) return fallback;
    return [
      ((int >> 24) & 255) / 255,
      ((int >> 16) & 255) / 255,
      ((int >> 8) & 255) / 255,
      (int & 255) / 255
    ];
  }

  function createShader(gl, type, source) {
    var shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      if (window.console) console.error("Shader compile error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function MetallicShaderMount(parent, uniforms, speed) {
    this.gl = null;
    this.program = null;
    this.parent = parent;
    this.locations = {};
    this.rafId = null;
    this.lastRenderTime = 0;
    this.currentFrame = 0;
    this.speed = speed;
    this.uniforms = uniforms;
    this.renderScale = 1;
    this.resolutionChanged = true;
    this.resizeObserver = null;
    this.intersectionObserver = null;
    this.isInViewport = true;
    this.disposed = false;

    this.canvas = document.createElement("canvas");
    parent.prepend(this.canvas);

    var gl = this.canvas.getContext("webgl2", {
      antialias: true,
      premultipliedAlpha: true,
      alpha: true
    });
    if (!gl) return;

    var vertex = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    var fragment = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertex || !fragment) return;

    var program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      if (window.console) console.error("Program link error:", gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    this.gl = gl;
    this.program = program;

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    var position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this._cacheLocations();
    this._setupObservers();
    this._handleResize();
    this._renderFrame(performance.now());
    if (speed !== 0) this._requestRender();
  }

  MetallicShaderMount.prototype._cacheLocations = function () {
    var gl = this.gl, program = this.program;
    if (!gl || !program) return;
    var names = [
      "u_time", "u_resolution", "u_pixelRatio", "u_colorBack", "u_colorTint",
      "u_softness", "u_repetition", "u_shiftRed", "u_shiftBlue", "u_distortion",
      "u_contour", "u_angle", "u_originX", "u_originY", "u_worldWidth",
      "u_worldHeight", "u_fit", "u_scale", "u_rotation", "u_offsetX", "u_offsetY"
    ];
    for (var i = 0; i < names.length; i++) {
      this.locations[names[i]] = gl.getUniformLocation(program, names[i]);
    }
  };

  MetallicShaderMount.prototype._setupObservers = function () {
    var self = this;
    this.resizeObserver = new ResizeObserver(function () { self._handleResize(); });
    this.resizeObserver.observe(this.parent);

    if (typeof IntersectionObserver !== "undefined") {
      this.intersectionObserver = new IntersectionObserver(function (entries) {
        var entry = entries[0];
        self.isInViewport = entry ? entry.isIntersecting : true;
        if (self.isInViewport && self.speed !== 0) self._requestRender();
      });
      this.intersectionObserver.observe(this.parent);
    }
  };

  MetallicShaderMount.prototype._handleResize = function () {
    var gl = this.gl;
    if (!gl || this.disposed) return;

    var width = this.parent.clientWidth;
    var height = this.parent.clientHeight;
    if (width === 0 || height === 0) return;

    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var targetRenderScale = Math.max(dpr, DEFAULT_MIN_PIXEL_RATIO);
    var targetPixelWidth = Math.round(width) * targetRenderScale;
    var targetPixelHeight = Math.round(height) * targetRenderScale;

    var headroom = Math.sqrt(DEFAULT_MAX_PIXEL_COUNT) / Math.sqrt(targetPixelWidth * targetPixelHeight);
    var clamp = Math.min(1, headroom);
    var newWidth = Math.round(targetPixelWidth * clamp);
    var newHeight = Math.round(targetPixelHeight * clamp);

    if (this.canvas.width === newWidth && this.canvas.height === newHeight) return;

    this.canvas.width = newWidth;
    this.canvas.height = newHeight;
    this.renderScale = newWidth / Math.round(width);
    this.resolutionChanged = true;
    gl.viewport(0, 0, newWidth, newHeight);
    this._renderFrame(performance.now());
  };

  MetallicShaderMount.prototype._pushUniforms = function () {
    var gl = this.gl;
    if (!gl) return;
    var u = this.uniforms;
    gl.uniform4fv(this.locations.u_colorBack || null, parseColor(u.colorBack));
    gl.uniform4fv(this.locations.u_colorTint || null, parseColor(u.colorTint));
    gl.uniform1f(this.locations.u_repetition || null, u.repetition);
    gl.uniform1f(this.locations.u_softness || null, u.softness);
    gl.uniform1f(this.locations.u_angle || null, u.angle);
    gl.uniform1f(this.locations.u_distortion || null, u.distortion);
    gl.uniform1f(this.locations.u_shiftRed || null, u.shiftRed);
    gl.uniform1f(this.locations.u_shiftBlue || null, u.shiftBlue);
    gl.uniform1f(this.locations.u_contour || null, 0);
    gl.uniform1f(this.locations.u_scale || null, u.scale);
    gl.uniform1f(this.locations.u_fit || null, 1);
    gl.uniform1f(this.locations.u_rotation || null, 0);
    gl.uniform1f(this.locations.u_offsetX || null, 0.1);
    gl.uniform1f(this.locations.u_offsetY || null, -0.1);
    gl.uniform1f(this.locations.u_originX || null, 0.5);
    gl.uniform1f(this.locations.u_originY || null, 0.5);
    gl.uniform1f(this.locations.u_worldWidth || null, 0);
    gl.uniform1f(this.locations.u_worldHeight || null, 0);
  };

  MetallicShaderMount.prototype._renderFrame = function (currentTime) {
    var gl = this.gl;
    if (!gl || !this.program || this.disposed) return;

    var dt = currentTime - this.lastRenderTime;
    this.lastRenderTime = currentTime;
    if (this.speed !== 0 && this.isInViewport) {
      this.currentFrame += dt * this.speed;
    }

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);

    gl.uniform1f(this.locations.u_time || null, this.currentFrame * 1e-3);
    if (this.resolutionChanged) {
      gl.uniform2f(this.locations.u_resolution || null, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.locations.u_pixelRatio || null, this.renderScale);
      this.resolutionChanged = false;
    }
    this._pushUniforms();

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (this.speed !== 0 && this.isInViewport) {
      this._requestRender();
    } else {
      this.rafId = null;
    }
  };

  MetallicShaderMount.prototype._requestRender = function () {
    var self = this;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(function (t) { self._renderFrame(t); });
  };

  MetallicShaderMount.prototype.setSpeed = function (speed) {
    this.speed = speed;
    if (speed === 0) {
      if (this.rafId !== null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this._renderFrame(performance.now());
      return;
    }
    if (this.rafId === null) {
      this.lastRenderTime = performance.now();
      this._requestRender();
    }
  };

  MetallicShaderMount.prototype.setUniforms = function (uniforms) {
    for (var k in uniforms) if (Object.prototype.hasOwnProperty.call(uniforms, k)) this.uniforms[k] = uniforms[k];
    if (this.rafId === null) this._renderFrame(performance.now());
  };

  MetallicShaderMount.prototype.dispose = function () {
    this.disposed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.resizeObserver = null;
    if (this.intersectionObserver) this.intersectionObserver.disconnect();
    this.intersectionObserver = null;
    if (this.gl && this.program) this.gl.deleteProgram(this.program);
    this.gl = null;
    this.program = null;
    this.canvas.remove();
  };

  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function enhance(button, options) {
    if (!button || button.__metallicMounted) return;
    if (typeof WebGL2RenderingContext === "undefined") return;

    var opts = {
      baseColor: "#000000",
      sheenColor: "#ffffff",
      bandCount: 4,
      edgeBlur: 0.5,
      flowAngle: 45,
      zoom: 8,
      warp: 0,
      redFringe: 0.3,
      blueFringe: 0.3,
      idleSpeed: 0.5,
      hoverSpeed: 0.9,
      clickSpeed: 2.2,
      shellClass: ""
    };
    if (options) for (var k in options) if (Object.prototype.hasOwnProperty.call(options, k)) opts[k] = options[k];

    var shell = document.createElement("span");
    shell.className = "metallic-shell" + (opts.shellClass ? " " + opts.shellClass : "");
    button.parentNode.insertBefore(shell, button);

    var canvasWrap = document.createElement("span");
    canvasWrap.className = "metallic-canvas-wrap";
    shell.appendChild(canvasWrap);
    shell.appendChild(button);
    button.classList.add("metallic-face");

    var reduced = prefersReducedMotion();
    var mount = new MetallicShaderMount(canvasWrap, {
      colorBack: opts.baseColor,
      colorTint: opts.sheenColor,
      repetition: opts.bandCount,
      softness: opts.edgeBlur,
      angle: opts.flowAngle,
      scale: opts.zoom,
      distortion: opts.warp,
      shiftRed: opts.redFringe,
      shiftBlue: opts.blueFringe
    }, reduced ? 0 : opts.idleSpeed);

    if (!mount.gl) {
      shell.parentNode.insertBefore(button, shell);
      shell.remove();
      return;
    }

    button.__metallicMounted = true;

    function spawnRipple(x, y) {
      if (reduced) return;
      var r = document.createElement("span");
      r.className = "metallic-ripple";
      r.style.left = x + "px";
      r.style.top = y + "px";
      canvasWrap.appendChild(r);
      setTimeout(function () { r.remove(); }, 600);
    }

    button.addEventListener("mouseenter", function () {
      shell.classList.add("is-hovered");
      if (!reduced) mount.setSpeed(opts.hoverSpeed);
    });
    button.addEventListener("mouseleave", function () {
      shell.classList.remove("is-hovered");
      shell.classList.remove("is-pressed");
      if (!reduced) mount.setSpeed(opts.idleSpeed);
    });
    button.addEventListener("pointerdown", function () { shell.classList.add("is-pressed"); });
    ["pointerup", "pointercancel"].forEach(function (ev) {
      button.addEventListener(ev, function () { shell.classList.remove("is-pressed"); });
    });
    button.addEventListener("click", function (e) {
      if (!reduced) {
        mount.setSpeed(opts.clickSpeed);
        setTimeout(function () {
          mount.setSpeed(shell.classList.contains("is-hovered") ? opts.hoverSpeed : opts.idleSpeed);
        }, 300);
      }
      var rect = shell.getBoundingClientRect();
      spawnRipple(e.clientX - rect.left, e.clientY - rect.top);
    });

    if (window.matchMedia) {
      window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (e) {
        reduced = e.matches;
        mount.setSpeed(reduced ? 0 : opts.idleSpeed);
      });
    }
  }

  window.MetallicButton = { enhance: enhance };
})();
