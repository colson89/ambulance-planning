var Service = require('node-windows').Service;

// Service object aanmaken
var svc = new Service({
  name: 'Ambulance Planning System',
  description: 'Ambulance Planning Web Application for Emergency Services',
  script: require('path').join(__dirname, 'dist', 'index.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: [{
    name: "NODE_ENV",
    value: "production"
  }, {
    name: "PORT", 
    value: "5000"
  }],
  wait: 2,
  grow: 0.5
});

// Event listeners
svc.on('install', function(){
  console.log('✓ Windows Service geïnstalleerd');
  console.log('Service naam: Ambulance Planning System');
  console.log('Poort: 5000');
  console.log('');
  console.log('Service wordt nu gestart...');
  svc.start();
});

svc.on('start', function(){
  console.log('✓ Service succesvol gestart');
  console.log('');
  console.log('Ambulance Planning System draait nu als Windows Service');
  console.log('Toegang via: http://localhost:5000');
  console.log('');
  console.log('Service beheer:');
  console.log('- Status: sc query "Ambulance Planning System"');
  console.log('- Stop: sc stop "Ambulance Planning System"');
  console.log('- Start: sc start "Ambulance Planning System"');
});

svc.on('error', function(err){
  console.error('Service fout:', err);
});

svc.on('invalidinstallation', function(){
  console.error('Service installatie ongeldig');
});

// Controleer of script bestaat
var fs = require('fs');
var scriptPath = require('path').join(__dirname, 'dist', 'index.js');

if (!fs.existsSync(scriptPath)) {
  console.error('FOUT: dist/index.js niet gevonden');
  console.error('Voer eerst uit: npm run build');
  process.exit(1);
}

console.log('Ambulance Planning System - Windows Service Installer');
console.log('========================================================');
console.log('');
console.log('Script pad:', scriptPath);
console.log('Service wordt geïnstalleerd...');
console.log('');

// Service installeren
svc.install();