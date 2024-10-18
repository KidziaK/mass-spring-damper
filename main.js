import * as BABYLON from '@babylonjs/core';
import * as GUI from '@babylonjs/gui/2D';
import * as CanvasJS from '@canvasjs/charts';
import * as math from 'mathjs';

const num_points = 200;

var xt_exact = [];
var xt_euler = [];
var xt_frog = [];

var ft_points = [];
var gt_points = [];
var ht_points = [];
var wt_points = [];

var trajectory_exact = [];
var trajectory_euler = [];
var trajectory_frog = [];


var forces_graph = new CanvasJS.Chart("forces_graph", {
  backgroundColor: "rgba(255, 255, 255, 0.6)",
	title :{
		text: "Forces"
	},
	data: [{
		type: "line",
    name: "f(t)",
    showInLegend: true,
		dataPoints: ft_points
	},{
		type: "line",
    name: "g(t)",
    showInLegend: true,
		dataPoints: gt_points
	},{
		type: "line",
    name: "h(t)",
    showInLegend: true,
		dataPoints: ht_points
	},{
		type: "line",
    name: "w(t)",
    showInLegend: true,
		dataPoints: wt_points
	}],
  axisY:{
    minimum: -250,
    maximum: 250,
  }
});

var position_graph = new CanvasJS.Chart("position_graph", {
  backgroundColor: "rgba(255, 255, 255, 0.6)",
	title :{
		text: "Position Graph - x(t)"
	},
	data: [{
		type: "line",
    name: "Exact",
    showInLegend: true,
		dataPoints: xt_exact
	},{
		type: "line",
    name: "Euler",
    showInLegend: true,
		dataPoints: xt_euler
	},{
		type: "line",
    name: "Leapfrog",
    showInLegend: true,
		dataPoints: xt_frog
	}],
  axisY:{
    minimum: -250,
    maximum: 250,
  }
});

var trajectory_graph = new CanvasJS.Chart("trajectory_graph", {
  backgroundColor: "rgba(255, 255, 255, 0.6)",
	title :{
		text: "Trajectory - [x(t), v(t)]"
	},
	data: [{
		type: "line",
    name: "Exact",
    showInLegend: true,
		dataPoints: trajectory_exact
	},{
		type: "line",
    name: "Euler",
    showInLegend: true,
		dataPoints: trajectory_euler
	},{
		type: "line",
    name: "Leapfrog",
    showInLegend: true,
		dataPoints: trajectory_frog
	}],
  axisX: {
    minimum: -250,
    maximum: 250,
    viewportMinimum: -250,
    viewportMaximum: 250
  },
  axisY: {
    minimum: -250,
    maximum: 250,
    viewportMinimum: -250,
    viewportMaximum: 250
  }
});

var updateGraphs = function () {
	forces_graph.render();
  position_graph.render();
  trajectory_graph.render();
  
};

const canvas = document.getElementById("render_canvas");
const engine = new BABYLON.Engine(canvas);

var is_constant = function(fun_text) {
  return true;
}

var specific_sol_constant = function(a, c) {
  // Specific Solution to the non-homogenous equation (NHE):
  // ma + kv + cs = alpha
  // with x(0) = x0 and v(0) = v0
  //
  // Since this is a constant function, x_S(t) = alpha / c is a specific solution to the NHE.

  const x_S = (t) => a / c;
  const v_S = (t) => 0;
  return [x_S, v_S];
}

var specific_sol_trig = function(a, b, w, m, k, c) {

}

var specific_solution = function(fun, m, k, c) {
  if (is_constant(fun)) {
    // f(t) = a
    const a = parseFloat(fun);
    return specific_sol_constant(a, c);
  }

  if (is_trig(fun)) {
    // f(t) = asin(wt) + bcos(wt)
    const a = parseFloat(fun);
    const b = parseFloat(fun);
    const w = parseFloat(fun);
    return specific_sol_trig(a, b, w, m, k, c);
  }
}

var x_exact = function(t, m, k, c, x0, v0, h, w) {
  // Homogenous Equation looks like:
  // ma + kv + cx = 0
  //
  // Characteristic Polynomial Solutions are:
  // lambda = A += Bi, where
  //
  // A = -k / 2m
  // B = sqrt(4cm - k^2)
  //
  // This is assuming the delta < 0 (k^2 - 4cm < 0).

  const A = -k / (2 * m);
  const B = Math.sqrt(4*c*m - k*k) / (2 * m);

  // Solution to the homogenous euqation is hence
  // x_H(t) = exp(At)(C*cos(Bt) + D*sin(Bt))

  // Now let's calculate specific solution for different values of h and w
  
  const [x_Sh, v_Sh] = specific_solution(h, m, k, c);
  var [x_Sw, v_Sw] = specific_solution(w, m, k, c);

  // Multiply by c since the RHS of the equation is
  // cw(t) + h(t)
  const x_Scw = (t) => c * x_Sw(t);
  const v_Scw = (t) => c * v_Sw(t);

  // x_H(0) = C
  // v_H(0) = AC - BD
  //
  // x0 = x(0) = x_H(0) + x_Sh(0) + x_Sw(0)
  // C = x0 - x_Sh(0) - x_Sw(0)
  //
  // v0 = v(0) = v_H(0) + v_Sh(0) + v_Sw(0)
  // v0 = AC - BD + v_Sh(0) + v_Sw(0)
  // D = (AC + v_Sh(0) + v_Sw(0) - v0) / B

  const C = x0 - x_Sh(0) - x_Scw(0);
  const D = (A*C + v_Sh(0) + v_Scw(0) - v0) / B;
  const x_H = (t) => Math.exp(A * t) * (C * Math.cos(B * t) + D * Math.sin(B * t));

  return x_H(t) + x_Sh(t) + x_Scw(t);
}

var cleanup_helix = function(scene, helix, sphere) {
  if (helix != null) {
    scene.removeMesh(helix);
    helix.dispose();
  }

  if (sphere != null) {
    scene.removeMesh(sphere);
    sphere.dispose();
  }
}

var InputTextWithLabel = function(label, height, default_val) {
  var panel = new GUI.StackPanel(`${label}_panel`);
  panel.isVertical = false;

  const label_text = new GUI.TextBlock(`${label}_label`, `${label}: `);
  label_text.width = "50px";

  const input_text = new GUI.InputText(`${label}_input`, default_val);
  input_text.width = "150px";

  panel.addControl(label_text);
  panel.addControl(input_text);

  panel.height = height;

  return [panel, input_text];
}

var toggle_img_btn = function(img_btn, value_wrapper, rgb_name, gray_name) {
  value_wrapper.value = !value_wrapper.value;
  if (value_wrapper.value) {
    img_btn.image.source = rgb_name;
    img_btn.alpha = 0.8;
  } else {
    img_btn.image.source = gray_name;
    img_btn.alpha = 0.4;
  }
}

var createHelix = function(scene, y0) {
  const r = 5;
  const k = 50;
  const L = 80;
  const l = 10;
  const R = 10;

  const num_points = 80;

  var helix = [];
    for (var i = 0; i < num_points; i++) {
        const t = i / num_points;
        helix.push(
          new BABYLON.Vector3(
            r * Math.cos(k * t), 
            (y0 - L + l + R) * t + L,
            r * Math.sin(k * t)
          )
        );
    }
    var helixCurve = new BABYLON.Curve3(helix);

    var helix_last_y_value = y0 + l + R;

    var bezier = BABYLON.Curve3.CreateCubicBezier(
      new BABYLON.Vector3(
        r * Math.cos(k), 
        helix_last_y_value,
        r * Math.sin(k)
      ),
      new BABYLON.Vector3(
        r * Math.cos(k + 1),
        helix_last_y_value - 1,
        r * Math.sin(k + 1)
      ),
      new BABYLON.Vector3(
        r * Math.cos(k + 5),
        helix_last_y_value - 5,
        r * Math.sin(k + 5)
      ),
      new BABYLON.Vector3(
        0,
        helix_last_y_value - 15,
        0
      ),
      20);


    var path = helixCurve.continue(bezier).getPoints();

  var shape = [];
  for (var theta = 0; theta < 2 * Math.PI; theta += Math.PI / 64) {
    shape.push(
      new BABYLON.Vector3(
        Math.cos(theta), 
        Math.sin(theta), 
        0
      )
    );
  }

  var extruded_helix = BABYLON.MeshBuilder.ExtrudeShape("extrudedShape", { shape: shape, path: path, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
  var sphere = BABYLON.MeshBuilder.CreateSphere("sphere", {diameter: 2 * R});

  sphere.translate(new BABYLON.Vector3(0, 1, 0), helix_last_y_value - 10 - R);
  return [extruded_helix, sphere];
}


var createScene = function() {
  { // default values
    var x0 = 50;
    var v0 = 0;

    var x_t = x0;
    var v_t = v0;
    var a_t = 0;

    var xn_t_euler = x0;
    var vn_t_euler = v0;

    var xn_t_frog = x0;
    var vn_t_frog = v0;
    var an_t_frog = 0;

    var dt = 0.01;
    
    var m = 1;
    var k = 0.1;  
    var c = 5;

    var h_t = "0";
    var w_t = "0";

    var t = 0;
    var i = 0;
  }

  var exact_sol = {value: true};
  var euler_sol = {value: false};
  var frogs_sol = {value: false};

  var scene = new BABYLON.Scene(engine);
  var camera = new BABYLON.ArcRotateCamera("Camera", -Math.PI / 2,  Math.PI / 2, -150, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);

  camera.lowerGammaLimit = 0;
  camera.upperGammaLimit = 0;

  camera.lowerBetaLimit = Math.PI / 2;
  camera.upperBetaLimit = Math.PI / 2;

  camera.lowerRadiusLimit = camera.radius;
  camera.upperRadiusLimit = camera.radius;

  var light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(-1, 1, 0), scene);
  light.diffuse = new BABYLON.Color3(0.5, 0.5, 0.5);

  var light2 = new BABYLON.HemisphericLight("hemiLight2", new BABYLON.Vector3(1, 1, 0), scene);
  light2.diffuse = new BABYLON.Color3(0.5, 0.5, 0.5);

  var layer = new BABYLON.Layer('BACKGROUND', 'blueprint.png', scene, true);

  var [helix_exact, sphere_exact] = createHelix(scene, 0);
  var [helix_euler, sphere_euler] = [null, null];
  var [helix_frog, sphere_frog] = [null, null];

  const advancedDynamicTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI('UI');

  const settings_button = GUI.Button.CreateImageOnlyButton("settings", "settings.svg");
  settings_button.widthInPixels = 50;
  settings_button.heightInPixels = 50;
  settings_button.thickness = 0;
  settings_button.leftInPixels = 20;
  settings_button.topInPixels = 20;
  settings_button.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  settings_button.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

  const hammer_btn = GUI.Button.CreateImageOnlyButton("hammer", "hammer.svg");
  hammer_btn.widthInPixels = 60;
  hammer_btn.heightInPixels = 60;
  hammer_btn.thickness = 0;
  hammer_btn.leftInPixels = -20;
  hammer_btn.topInPixels = 20;
  hammer_btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  hammer_btn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;

  const graph_btn = GUI.Button.CreateImageOnlyButton("graph", "graph.svg");
  graph_btn.widthInPixels = 60;
  graph_btn.heightInPixels = 60;
  graph_btn.thickness = 0;
  graph_btn.leftInPixels = -20;
  graph_btn.topInPixels = -20;
  graph_btn.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  graph_btn.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

  const tools_close = GUI.Button.CreateImageOnlyButton("tools_close", "cross.svg");
  tools_close.thickness = 0;
  tools_close.widthInPixels = 40;
  tools_close.heightInPixels = 40;

  const giga_chad_img = GUI.Button.CreateImageOnlyButton("giga_chad", "giga_chad.png"); 
  giga_chad_img.thickness = 0;
  giga_chad_img.height = 0.9;
  giga_chad_img.alpha = 0.8;
  
  const euler_img = GUI.Button.CreateImageOnlyButton("euler", "euler_gray.png"); 
  euler_img.thickness = 0;
  euler_img.height = 0.9;
  euler_img.alpha = 0.4;

  const pepe_euler_img = GUI.Button.CreateImageOnlyButton("pepe_euler_img", "pepe_euler_gray.png"); 
  pepe_euler_img.thickness = 0;
  pepe_euler_img.height = 0.9;
  pepe_euler_img.alpha = 0.4;

  const tools_grid = new GUI.Grid('tools_grid');
  tools_grid.addRowDefinition(0.07);
  tools_grid.addRowDefinition(0.31);
  tools_grid.addRowDefinition(0.31);
  tools_grid.addRowDefinition(0.31);
  tools_grid.addColumnDefinition(0.1);
  tools_grid.addColumnDefinition(0.8);
  tools_grid.addColumnDefinition(0.1);
  tools_grid.addControl(tools_close, 0, 2);
  tools_grid.addControl(giga_chad_img, 1, 1);
  tools_grid.addControl(euler_img, 2, 1);
  tools_grid.addControl(pepe_euler_img, 3, 1);

  const tools_container = new GUI.Container('tools_container');
  tools_container.width = 0.125;
  tools_container.height = 0.85;
  tools_container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
  tools_container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  tools_container.background = 'white';
  tools_container.alpha = 0.6;
  tools_container.leftInPixels = -20;
  tools_container.topInPixels = 20;
  tools_container.isVisible = false;
  tools_container.cornerRadius = 10;
  tools_container.addControl(tools_grid);
  
  const close_button = GUI.Button.CreateImageOnlyButton("close", "cross.svg");
  close_button.thickness = 0;
  close_button.widthInPixels = 50;
  close_button.heightInPixels = 50;

  const single_block_height = "30px";

  const restart_btn = GUI.Button.CreateSimpleButton("restart_btn", "Restart");
  restart_btn.height = single_block_height;
  restart_btn.background = "#0088FF";
  restart_btn.alpha = 1.0;
  
  const grid = new GUI.Grid('settings_panel');
  for (i = 0; i < 22; i++) {
    grid.addRowDefinition(0.05);
  }
  grid.addColumnDefinition(0.1);
  grid.addColumnDefinition(0.8);
  grid.addColumnDefinition(0.1);
  grid.addControl(close_button, 0, 0);
  
  const basic_info = new GUI.TextBlock("basic_info", "Basic Information");
  basic_info.height = single_block_height;
  basic_info.underline = true;
  basic_info.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(basic_info, 1, 1);

  const fps = new GUI.TextBlock("fps", `FPS: ${engine.getFps().toFixed()}`);
  fps.height = single_block_height;
  fps.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(fps, 2, 1);

  const kinematics = new GUI.TextBlock("kinematics", "Kinematics");
  kinematics.height = single_block_height;
  kinematics.underline = true;
  kinematics.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(kinematics, 3, 1);


  const xt_panel = new GUI.TextBlock("x_t", "x(t) = 0");
  xt_panel.height = single_block_height;
  xt_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(xt_panel, 4, 1);

  const vt_panel = new GUI.TextBlock("v_t", "v(t) = 0");
  vt_panel.height = single_block_height;
  vt_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(vt_panel, 5, 1);

  const at_panel = new GUI.TextBlock("a_t", "a(t) = 0");
  at_panel.height = single_block_height;
  at_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(at_panel, 6, 1);

  const functions_panel = new GUI.TextBlock("functions_panel", "Functions");
  functions_panel.height = single_block_height;
  functions_panel.underline = true;
  functions_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(functions_panel, 7, 1);

  const ft_panel = new GUI.TextBlock("f_t", "f(t) = 0");
  ft_panel.height = single_block_height;
  ft_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(ft_panel, 8, 1);

  const gt_panel = new GUI.TextBlock("g_t", "g(t) = 0");
  gt_panel.height = single_block_height;
  gt_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(gt_panel, 9, 1);

  const ht_panel = new GUI.TextBlock("h_t", "h(t) = 0");
  ht_panel.height = single_block_height;
  ht_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(ht_panel, 10, 1);

  const wt_panel = new GUI.TextBlock("w_t", "w(t) = 0");
  wt_panel.height = single_block_height;
  wt_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(wt_panel, 11, 1);

  const properties_panel = new GUI.TextBlock("properties_panel", "Properties");
  properties_panel.height = single_block_height;
  properties_panel.underline = true;
  properties_panel.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  grid.addControl(properties_panel, 12, 1);

  const [x0_panel, x0_text] = InputTextWithLabel("x0", single_block_height, x0);
  grid.addControl(x0_panel, 13, 1);

  const [v0_panel, v0_text] = InputTextWithLabel("v0", single_block_height, v0);
  grid.addControl(v0_panel, 14, 1);

  const [dt_panel, dt_text] = InputTextWithLabel("dt", single_block_height, dt);
  grid.addControl(dt_panel, 15, 1);

  const [m_panel, m_text] = InputTextWithLabel("m", single_block_height, m);
  grid.addControl(m_panel, 16, 1);

  const [k_panel, k_text] = InputTextWithLabel("k", single_block_height, k);
  grid.addControl(k_panel, 17, 1);

  const [c_panel, c_text] = InputTextWithLabel("c", single_block_height, c);
  grid.addControl(c_panel, 18, 1);

  const [w_t_panel, w_t_text] = InputTextWithLabel("w(t)", single_block_height, w_t);
  grid.addControl(w_t_panel, 19, 1);

  const [h_t_panel, h_t_text] = InputTextWithLabel("h(t)", single_block_height, h_t);
  grid.addControl(h_t_panel, 20, 1);

  grid.addControl(restart_btn, 21, 1);

  const settings_container = new GUI.Container('settings_container');
  settings_container.width = 0.15;
  settings_container.height = 0.85;
  settings_container.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
  settings_container.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP;
  settings_container.background = 'white';
  settings_container.alpha = 0.6;
  settings_container.leftInPixels = 20;
  settings_container.topInPixels = 20;
  settings_container.isVisible = false;
  settings_container.addControl(grid);

  settings_button.onPointerClickObservable.add(function(e){
    settings_container.isVisible = true;
    settings_button.isVisible = false;
  });

  close_button.onPointerClickObservable.add(function(e){
    settings_container.isVisible = false;
    settings_button.isVisible = true;
  });

  hammer_btn.onPointerClickObservable.add(function(e){
    tools_container.isVisible = true;
    hammer_btn.isVisible = false;
  });

  var toggle_visibility = function(element_id) {
    var element = document.getElementById(element_id);
    if (element.style.visibility === "hidden") {
      element.style.visibility = "visible";
    } else {
      element.style.visibility = "hidden";
    }
  }

  graph_btn.onPointerClickObservable.add(function(e) {
    toggle_visibility('forces_graph');
    toggle_visibility('position_graph');
    toggle_visibility('trajectory_graph');
  });

  tools_close.onPointerClickObservable.add(function(e){
    tools_container.isVisible = false;
    hammer_btn.isVisible = true;
  });

  giga_chad_img.onPointerClickObservable.add(function(e){
    toggle_img_btn(giga_chad_img, exact_sol, "giga_chad.png", "giga_chad_gray.png");
  });

  euler_img.onPointerClickObservable.add(function(e){
    toggle_img_btn(euler_img, euler_sol, "euler.png", "euler_gray.png");
  });

  pepe_euler_img.onPointerClickObservable.add(function(e){
    toggle_img_btn(pepe_euler_img, frogs_sol, "pepe_euler.png", "pepe_euler_gray.png");
  });

  giga_chad_img.onPointerOutObservable.add(function(e){
    if (exact_sol.value) {
      giga_chad_img.alpha = 0.8;
    } else {
      giga_chad_img.alpha = 0.4;
    }
  });

  euler_img.onPointerOutObservable.add(function(e){
    if (euler_sol.value) {
      euler_img.alpha = 0.8;
    } else {
      euler_img.alpha = 0.4;
    }
  });

  pepe_euler_img.onPointerOutObservable.add(function(e){
    if (frogs_sol.value) {
      pepe_euler_img.alpha = 0.8;
    } else {
      pepe_euler_img.alpha = 0.4;
    }
  });

  restart_btn.onPointerClickObservable.add(function(e) {
    dt = parseFloat(dt_text.text);
    x0 = parseFloat(x0_text.text);
    v0 = parseFloat(v0_text.text);
    m = parseFloat(m_text.text);
    k = parseFloat(k_text.text);  
    c = parseFloat(c_text.text);

    x_t = x0;
    v_t = v0;
    a_t = 0;

    xn_t_euler = x0;
    vn_t_euler = v0;

    xn_t_frog = x0;
    vn_t_frog = v0;
    an_t_frog = 0;

    h_t = h_t_text.text;
    w_t = w_t_text.text;

    t = 0;
    i = 0;

    xt_exact.length = 0;
    xt_euler.length = 0;
    xt_frog.length = 0;

    ft_points.length = 0;
    gt_points.length = 0;
    ht_points.length = 0;
    wt_points.length = 0;
    
    trajectory_exact.length = 0;
    trajectory_euler.length = 0;
    trajectory_frog.length = 0;
  });
 
  advancedDynamicTexture.addControl(settings_container);
  advancedDynamicTexture.addControl(settings_button);
  advancedDynamicTexture.addControl(hammer_btn);
  advancedDynamicTexture.addControl(tools_container);
  advancedDynamicTexture.addControl(graph_btn);

  

  scene.onBeforeRenderObservable.add(() => {
    const h = dt;
    t += h;
    i += 1;

    
    const x_t_prev = x_t;
    x_t = x_exact(t, m, k, c, x0, v0, h_t, w_t);

    const v_t_prev = v_t;
    v_t = (x_t - x_t_prev) / h;

    a_t = (v_t - v_t_prev) / h;

    cleanup_helix(scene, helix_exact, sphere_exact);
    cleanup_helix(scene, helix_euler, sphere_euler);
    cleanup_helix(scene, helix_frog, sphere_frog);

    const w_eval = math.evaluate(w_t.replace("t", t));
    const h_eval = math.evaluate(h_t.replace("t", t));
    const f_eval = c * (w_eval - x_t);
    const g_eval = -k * v_t;

    w_t_panel.text = `w(t) = ${w_eval.toFixed(4)}`;
    h_t_panel.text = `h(t) = ${h_eval.toFixed(4)}`;
    ft_panel.text = `f(t) = ${f_eval.toFixed(4)}`;
    gt_panel.text = `g(t) = ${g_eval.toFixed(4)}`;

    if (exact_sol.value) {
      [helix_exact, sphere_exact] = createHelix(scene, x_t);
    }

    const x_old = xn_t_euler;
    const v_old = vn_t_euler;

    xn_t_euler = x_old + h * v_old;
    vn_t_euler = v_old + h * (c * (w_eval - x_old) - k * v_old + h_eval) / m;

    if (euler_sol.value) {
      [helix_euler, sphere_euler] = createHelix(scene, xn_t_euler);
      helix_euler.visibility = 0.5;
      sphere_euler.visibility = 0.5;
    }

    
    const x_old_frog = xn_t_frog;
    const v_old_frog = vn_t_frog;
    const a_old_frog = an_t_frog;

    an_t_frog = (c * (w_eval - x_old_frog) - k * v_old_frog + h_eval) / m;
    
    xn_t_frog = x_old_frog + v_old_frog * h + 0.5 * a_old_frog * h * h;
    vn_t_frog = v_old_frog + 0.5 * (a_old_frog + an_t_frog) * h;

    if (frogs_sol.value) {
      [helix_frog, sphere_frog] = createHelix(scene, xn_t_frog);
      helix_frog.visibility = 0.5;
      sphere_frog.visibility = 0.5;
    }

    fps.text = `FPS: ${engine.getFps().toFixed()}`;
    xt_panel.text = `x(t) = ${x_t.toFixed(4)}`;
    vt_panel.text = `v(t) = ${v_t.toFixed(4)}`;
    at_panel.text = `a(t) = ${a_t.toFixed(4)}`;

    if (i % 10 == 0) {
      if (ft_points.lenght > num_points) {
        ft_points.shift();
        ht_points.shift();
        wt_points.shift();
        gt_points.shift();

        xt_exact.shift();
        xt_euler.shift();
        xt_frog.shift();

        trajectory_exact.shift();
        trajectory_euler.shift();
        trajectory_frog.shift();
      }
      

      ft_points.push({x: t, y: f_eval});
      ht_points.push({x: t, y: h_eval});
      wt_points.push({x: t, y: w_eval});
      gt_points.push({x: t, y: g_eval});

      xt_exact.push({x: t, y: x_t});
      xt_euler.push({x: t, y: xn_t_euler});
      xt_frog.push({x: t, y: xn_t_frog});

      trajectory_exact.push({x: x_t, y: v_t});
      trajectory_euler.push({x: xn_t_euler, y: vn_t_euler});
      trajectory_frog.push({x: xn_t_frog, y: vn_t_frog});

      updateGraphs();
    }
  });

  

  return scene;
};

const scene = createScene();

engine.runRenderLoop(function() {
  scene.render();
});

window.addEventListener('resize', function() {
  engine.resize();
})