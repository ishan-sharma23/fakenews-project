pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        timestamps()
    }

    environment {
        COMPOSE_CMD = 'docker compose'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Docker Preflight') {
            steps {
                bat '''
@echo off
where docker >nul 2>&1 || (
  echo ERROR: Docker CLI is not installed or not in PATH.
  exit /b 1
)

docker version >nul 2>&1 || (
  echo ERROR: Docker daemon is not reachable.
  echo On Windows, start Docker Desktop and wait until it shows "Engine running".
  echo If Jenkins runs as a Windows service, ensure that service account can access Docker.
  exit /b 1
)

docker compose version >nul 2>&1
if %ERRORLEVEL%==0 (
  echo Compose plugin available: docker compose
) else (
  docker-compose --version >nul 2>&1 || (
    echo ERROR: Neither "docker compose" nor "docker-compose" is available.
    exit /b 1
  )
  echo Standalone compose available: docker-compose
)
'''

                script {
                    def hasComposePlugin = bat(
                        returnStatus: true,
                        script: '@echo off\ndocker compose version >nul 2>&1'
                    ) == 0
                    env.COMPOSE_CMD = hasComposePlugin ? 'docker compose' : 'docker-compose'
                    echo "Using compose command: ${env.COMPOSE_CMD}"
                }
            }
        }

        stage('Build') {
            steps {
                bat '%COMPOSE_CMD% build'
            }
        }

        stage('Deploy') {
            steps {
                bat '%COMPOSE_CMD% down || echo "No running containers"'
                bat '%COMPOSE_CMD% up -d --remove-orphans'
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
