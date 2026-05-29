#!/bin/bash

set -e

echo "=== Start DevOps Lab 1 (Task Tracker) ==="

if [ "$EUID" -ne 0 ]; then
  echo "Error: Script must be run with root privileges (e.g.: sudo ./scripts/setup.sh)"
  exit 1
fi

echo "--> Installing required packages..."
apt-get update
apt-get install -y curl nginx postgresql postgresql-contrib nodejs npm sudo

echo "--> Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER devops_user WITH PASSWORD 'password';" || true
sudo -u postgres psql -c "CREATE DATABASE devops_db OWNER devops_user;" || true

echo "--> Creating users..."

create_user_with_pass() {
    local username=$1
    local is_admin=$2

    if id "$username" &>/dev/null; then
        echo "User $username already exists."
    else
        if [ "$is_admin" == "yes" ]; then
            useradd -m -s /bin/bash -G sudo "$username"
        else
            useradd -m -s /bin/bash "$username"
        fi
        echo "$username:12345678" | chpasswd
        chage -d 0 "$username"
    fi
}

create_user_with_pass "teacher" "yes"
create_user_with_pass "student" "yes"
create_user_with_pass "operator" "no"

if ! id "app" &>/dev/null; then
    useradd -r -s /bin/false app
fi

echo "--> Setting up sudo permissions for operator..."
cat <<EOF > /etc/sudoers.d/operator
operator ALL=(ALL) NOPASSWD: /bin/systemctl start devops_labs, /bin/systemctl stop devops_labs, /bin/systemctl restart devops_labs, /bin/systemctl status devops_labs, /bin/systemctl reload nginx
EOF
chmod 440 /etc/sudoers.d/operator

echo "--> Setting up Node.js application..."
mkdir -p /opt/devops_labs
cp -r ./app/* /opt/devops_labs/
cd /opt/devops_labs
npm install
chown -R app:app /opt/devops_labs

echo "--> Setting up configuration file..."
mkdir -p /etc/devops_labs
cp ./config/config.json /etc/devops_labs/
chown root:app /etc/devops_labs/config.json
chmod 640 /etc/devops_labs/config.json

echo "--> Setting up Systemd..."
cp ./config/devops_labs.socket /etc/systemd/system/
cp ./config/devops_labs.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now devops_labs.socket

echo "--> Setting up Nginx..."
cp ./config/devops_labs.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/devops_labs.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx
systemctl enable nginx

echo "--> Creating gradebook file for student..."
echo "7" > /home/student/gradebook
chown student:student /home/student/gradebook
chmod 644 /home/student/gradebook

echo "--> Blocking default user..."
if [ -n "$SUDO_USER" ] && [ "$SUDO_USER" != "root" ]; then
    usermod -L "$SUDO_USER"
    echo "User $SUDO_USER successfully blocked. Now log in as student, teacher or operator."
fi

echo "=== Setup completed successfully! ==="