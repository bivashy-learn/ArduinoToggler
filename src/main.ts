import { SerialPort } from "tauri-plugin-serialplugin";

let portsComboBox: HTMLSelectElement | null;
let refreshButton: HTMLButtonElement | null;
let activePortInfo: HTMLHeadingElement | null;
let ledToggleCheckbox: HTMLInputElement | null;
let selectedPort: SerialPort | null;

// async function greet() {
//   console.log("Available ports:", 
//   if (greetMsgEl && greetInputEl) {
//     // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
//     greetMsgEl.textContent = await invoke("greet", {
//       name: greetInputEl.value,
//     });
//   }
// }

async function findUSBPorts() {
  const ports = await SerialPort.available_ports();
  return Object.entries(ports).filter(([_, port]) => port.type === 'USB');
}

function removeAllOptions(selectElement: HTMLSelectElement) {
  while (selectElement.options.length > 0) {
    selectElement.remove(0)
  }
}

async function refreshPortsComboBox() {
  if(portsComboBox)
    removeAllOptions(portsComboBox);
  const availablePorts = await findUSBPorts();
  availablePorts.forEach(([key, port]) => {
    const option = new Option(`${key} (PID: ${port.pid})`, key);
    portsComboBox?.add(option);
  })
  if (portsComboBox)
    portsComboBox.selectedIndex = -1;
}

async function handleSelectPort() {
  const selectedIndex = portsComboBox?.selectedIndex;
  if (selectedIndex === undefined)
    return;
  const selectedPortKey = portsComboBox?.options[selectedIndex].value;
  if (!selectedPortKey)
    return;
  selectPort(selectedPortKey);
}

async function selectPort(key: string | null) {
  if (key) {
    if (activePortInfo)
      activePortInfo.textContent = "Активный порт: " + key;
    selectedPort = new SerialPort({
      path: key,
      baudRate: 9600
    })
    await selectedPort.open();;
    selectedPort.disconnected(() => {
      selectPort(null);
    });
    if (ledToggleCheckbox)
      ledToggleCheckbox.disabled = false;
  } else {
    if (activePortInfo)
      activePortInfo.textContent = "Активный порт: не указан";
    selectedPort = null;
  }
}

function handleLedToggle() {
  if (!selectedPort)
    return;
  if (ledToggleCheckbox?.checked)
    selectedPort.write('1');
  else
    selectedPort.write('0');
}

window.addEventListener("DOMContentLoaded", async () => {
  activePortInfo = document.getElementById('active-port-info') as HTMLHeadingElement;
  portsComboBox = document.getElementById('ports') as HTMLSelectElement;
  refreshButton = document.getElementById('refresh-button') as HTMLButtonElement;
  ledToggleCheckbox = document.getElementById('ledtoggle') as HTMLInputElement;

  await refreshPortsComboBox();

  refreshButton.addEventListener('click', () => refreshPortsComboBox());
  portsComboBox.addEventListener('change', handleSelectPort);
  ledToggleCheckbox.addEventListener('change', handleLedToggle);
});

