# DevOps Lab: Infrastructure as Code & Configuration Management

Цей репозиторій містить автоматизацію для розгортання двовузлової інфраструктури (Web Worker + Database) за допомогою Terraform та Ansible.

## Структура проєкту
- `terraform/` — конфігурація для створення віртуальних машин (KVM/libvirt).
- `ansible/` — плейбуки та ролі для налаштування ОС, бази даних, Nginx та Node.js застосунку.

## Вимоги (Prerequisites)
- Встановлений Terraform
- Встановлений Ansible
- Налаштований провайдер libvirt

## Інструкція з розгортання

### 1. Підняття інфраструктури
Перейдіть до директорії terraform та виконайте розгортання:
```bash
cd terraform
terraform init
terraform apply -auto-approve
```
### 2. Налаштування серверів
Оновіть IP-адреси у файлі `ansible/inventory.ini` на ті, що видав Terraform. Потім запустіть плейбук:

```bash
cd ../ansible
ansible-playbook -i inventory.ini playbook.yml
```
### 3. Запуск застосунку
Після відпрацювання Ansible, розмістіть код застосунку в директорію `/opt/web-app/` на worker-вузлі та перезапустіть сервіс:

```bash
sudo systemctl restart web-app