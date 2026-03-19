pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                bat 'docker-compose build'
            }
        }

        stage('Deploy') {
            steps {
                                bat '''
@echo off
setlocal EnableDelayedExpansion

echo Checking for Docker containers already using host port 5000...
for /f %%I in ('docker ps -q --filter "publish=5000"') do (
    echo Stopping container %%I
    docker stop %%I
)

docker-compose down || echo "No running containers"

echo Verifying host port 5000 is free...
set PID=
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    set PID=%%P
    goto :foundPid
)

goto :portFree

:foundPid
echo ERROR: Port 5000 is still in use by PID !PID!.
echo Stop that process on Jenkins host or change backend port mapping before deploy.
exit /b 1

:portFree
echo Port 5000 is free. Starting containers...
docker-compose up -d --remove-orphans
'''
            }
        }
    }

    post {
        success {
            echo 'Deployed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs.'
        }
    }
}
