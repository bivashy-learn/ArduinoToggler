import { SerialPort } from "tauri-plugin-serialplugin";
import { message } from '@tauri-apps/plugin-dialog';

let portsComboBox: HTMLSelectElement | null;
let refreshButton: HTMLButtonElement | null;
let activePortInfo: HTMLHeadingElement | null;
let ledToggleCheckbox: HTMLInputElement | null;
let selectedPort: SerialPort | null;

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
  selectPort(null);
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
    if (selectedPort)
      await selectedPort.close();
    if (activePortInfo)
      activePortInfo.textContent = "Активный порт: " + key;
    selectedPort = new SerialPort({
      path: key,
      baudRate: 9600,
      timeout: 100,
    })
    try {
      await selectedPort.open();
    } catch (err) {
      selectPort(null);
      await message('Не удалось подключиться к порту, возможно он используется другой программой', { title: 'Ошибка!', kind: 'error' });
      return;
    }
    await selectedPort.disconnected(() => {
      console.log("disconnected")
      selectPort(null);
    });
    console.log("setup listener")
    if (ledToggleCheckbox)
      ledToggleCheckbox.disabled = false;
  } else {
    selectedPort?.write('0');
    if (activePortInfo)
      activePortInfo.textContent = "Активный порт: не указан";
    if (portsComboBox)
      portsComboBox.selectedIndex = -1;
    if (ledToggleCheckbox) {
      ledToggleCheckbox.disabled = true;
      ledToggleCheckbox.checked = false;
    }
    selectedPort = null;
  }
}

function handleLedToggle() {
  if (!selectedPort)
    return;
  try {
    if (ledToggleCheckbox?.checked)
      selectedPort.write('1');
    else
      selectedPort.write('0');
  } catch (err) {
    selectPort(null);
  }
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

