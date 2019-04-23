import * as THREE from "three";
import { simplifyMesh } from "./simplifyModifier.js";
import GLTFLoader from "./components/gltfLoader.js";
import OrbitControls from "./components/orbitControls.js";
import Loader from "./components/Loader.js";
import ColladaLoader from "./components/colladaLoader.js";

import * as dat from "dat.gui";

var camera,
  ocontrols,
  model,
  modelGroup,
  modelOptimized,
  modelMaxSize,
  fileLoader;

function init() {
  const models = {
    "": "",
    Elf:
      "https://rawgit.com/mrdoob/three.js/master/examples/models/collada/elf/elf.dae",
    Drone:
      "https://rawgit.com/mrdoob/three.js/master/examples/models/collada/elf/elf.dae"
  };

  // call the render function
  var controls = new function() {
    this.state = Object.keys(models)[0];
    this.rotationSpeed = 0.01;
    this.optimizationLevel = 0.6;
    this.optimizeModel = () => optimizeModel();
    this.preserveTexture = true;
    this.wireframe = false;
  }();
  var gui = new dat.GUI();
  const dropdown = gui.add(controls, "state").options(Object.keys(models));
  dropdown.onChange(item => {
    fileLoader.loadURL(models[item]);
    // fetch(models[item])
    //   .then(response =>
    //     response.text().then(text => {
    //       const file = new Blob([text], {
    //         type: "text/plain"
    //       });
    //       file.name = models[item];
    //       fileLoader.loadFile(file);
    //     })
    //   )
    //   .catch(error => new Error(error));
  });
  setTimeout(() => {
    dropdown.setValue(Object.keys(models)[1]);
  }, 1000);

  gui.add(controls, "rotationSpeed", 0, 0.06);
  gui.add(controls, "optimizationLevel", 0, 1);
  gui.add(controls, "preserveTexture");
  gui.add(controls, "wireframe");
  gui.add(controls, "optimizeModel");
  requestAnimationFrame(render);
  document.body.insertBefore(
    gui.domElement,
    document.getElementById("WebGL-output")
  );

  var scene = new THREE.Scene();
  setupDropzone(scene);
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  scene.add(camera);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setClearColor(new THREE.Color(0.7, 0.8, 0.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  // add subtle ambient lighting
  var ambientLight = new THREE.AmbientLight(0x444444);
  scene.add(ambientLight);
  // add spotlight for the shadows
  var spotLight = new THREE.SpotLight(0xffffff);
  spotLight.position.set(-40, 60, -10);
  spotLight.castShadow = true;
  scene.add(spotLight);

  var light = new THREE.HemisphereLight(0xbbbbff, 0x444422);
  light.position.set(0, 1, 0);
  scene.add(light);

  var model, modelOptimized;

  // add the output of the renderer to the html element
  document.getElementById("WebGL-output").appendChild(renderer.domElement);

  function recursivelyOptimize(model) {
    if (model.isMesh) {
      simplifyMesh(
        model.geometry,
        controls.optimizationLevel,
        controls.preserveTexture
      ).then(newGeo => (model.geometry = newGeo));
    }
    model.children.forEach(recursivelyOptimize);
  }

  function optimizeModel() {
    scene.remove(modelOptimized);
    modelOptimized = modelGroup.clone();
    recursivelyOptimize(modelOptimized);
    modelOptimized.position.x = modelMaxSize;
    scene.add(modelOptimized);
  }

  function render() {
    if (modelGroup) {
      modelGroup.rotation.z += controls.rotationSpeed;
      toWireframe(modelGroup, controls.wireframe);
    }
    if (modelOptimized) {
      modelOptimized.rotation.copy(modelGroup.rotation);
    }

    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }

  function toWireframe(obj, wireframeMode) {
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => (m.wireframe = wireframeMode));
    } else if (obj.material) {
      obj.material.wireframe = wireframeMode;
    }
    obj.children.forEach(el => toWireframe(el, wireframeMode));
  }

  function setupDropzone(scene) {
    fileLoader = new Loader(obj => {
      scene.remove(modelGroup);
      scene.remove(modelOptimized);

      modelGroup = obj;

      scene.add(modelGroup);

      // update camera position to contain entire camera in view
      const bbox = new THREE.BoxHelper(modelGroup, new THREE.Color(0xff9900));
      bbox.geometry.computeBoundingBox();
      const box = bbox.geometry.boundingBox;

      modelMaxSize = Math.max(
        box.max.x - box.min.x,
        box.max.y - box.min.y,
        box.max.z - box.min.z
      );

      camera.position.set(0, box.max.y - box.min.y, Math.abs(modelMaxSize * 3));

      ocontrols = new THREE.OrbitControls(camera);
      ocontrols.target.set(2.5, (box.max.y - box.min.y) / 2, 0);

      optimizeModel();

      ocontrols.update();
    });
    document.addEventListener(
      "dragover",
      function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      },
      false
    );
    document.addEventListener(
      "drop",
      function(event) {
        event.preventDefault();
        if (event.dataTransfer.files.length > 0) {
          fileLoader.loadFiles(event.dataTransfer.files);
        }
      },
      false
    );
  }
}

init();
