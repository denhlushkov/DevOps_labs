terraform {
  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.7.6"
    }
  }
}

provider "libvirt" {
  uri = "qemu:///system"
}

resource "libvirt_volume" "ubuntu_image" {
  name   = "ubuntu-jammy-base.qcow2"
  source = "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
  format = "qcow2"
}

resource "libvirt_cloudinit_disk" "commoninit" {
  name      = "commoninit.iso"
  user_data = file("${path.module}/cloud-init.yaml")
}

resource "libvirt_network" "lab_net" {
  name      = "lab4_network"
  mode      = "nat"
  domain    = "lab.local"
  addresses = ["10.17.3.0/24"]
  dhcp {
    enabled = true
  }
}

resource "libvirt_volume" "worker_vol" {
  name           = "worker-vol.qcow2"
  base_volume_id = libvirt_volume.ubuntu_image.id
}

resource "libvirt_domain" "worker" {
  name   = "lab4-worker"
  memory = "1024"
  vcpu   = 2

  cloudinit = libvirt_cloudinit_disk.commoninit.id

  network_interface {
    network_id     = libvirt_network.lab_net.id
    wait_for_lease = true # Terraform чекатиме на отримання IP від DHCP
  }

  disk {
    volume_id = libvirt_volume.worker_vol.id
  }

  console {
    type        = "pty"
    target_port = "0"
    target_type = "serial"
  }
}

resource "libvirt_volume" "db_vol" {
  name           = "db-vol.qcow2"
  base_volume_id = libvirt_volume.ubuntu_image.id
}

resource "libvirt_domain" "db" {
  name   = "lab4-db"
  memory = "1024"
  vcpu   = 2

  cloudinit = libvirt_cloudinit_disk.commoninit.id

  network_interface {
    network_id     = libvirt_network.lab_net.id
    wait_for_lease = true
  }

  disk {
    volume_id = libvirt_volume.db_vol.id
  }

  console {
    type        = "pty"
    target_port = "0"
    target_type = "serial"
  }
}

output "worker_ip" {
  value = libvirt_domain.worker.network_interface[0].addresses[0]
}

output "db_ip" {
  value = libvirt_domain.db.network_interface[0].addresses[0]
}