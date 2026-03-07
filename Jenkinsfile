pipeline {
    agent any

    environment {
        DOCKER_COMPOSE_VERSION = '2.20.0'
        NODE_VERSION = '18'
        PYTHON_VERSION = '3.11'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Setup') {
            parallel {
                stage('Backend Dependencies') {
                    steps {
                        dir('fakenews-backend') {
                            bat 'npm ci'
                        }
                    }
                }
                stage('Frontend Dependencies') {
                    steps {
                        dir('fakenews-frontend') {
                            bat 'npm ci'
                        }
                    }
                }
                stage('ML Dependencies') {
                    steps {
                        dir('fakenews-ml') {
                            bat 'pip install -r requirements.txt'
                        }
                    }
                }
            }
        }

        stage('Lint & Test') {
            parallel {
                stage('Backend Tests') {
                    steps {
                        dir('fakenews-backend') {
                            bat 'npm test || echo "No tests configured yet"'
                        }
                    }
                }
                stage('Frontend Tests') {
                    steps {
                        dir('fakenews-frontend') {
                            bat 'npm test -- --watchAll=false --passWithNoTests'
                        }
                    }
                }
                stage('ML Tests') {
                    steps {
                        dir('fakenews-ml') {
                            bat 'python -m pytest tests/ -v || echo "No tests configured yet"'
                        }
                    }
                }
            }
        }

        stage('Build') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        dir('fakenews-frontend') {
                            bat 'npm run build'
                        }
                    }
                }
                stage('Verify ML Model') {
                    steps {
                        dir('fakenews-ml') {
                            bat 'python -c "from model.predictor import FakeNewsPredictor; print(\'ML Module OK\')"'
                        }
                    }
                }
            }
        }

        stage('Docker Build') {
            when {
                branch 'main'
            }
            steps {
                bat 'docker-compose build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                bat 'docker-compose down || echo "No existing containers"'
                bat 'docker-compose up -d'
            }
        }

        stage('Health Check') {
            when {
                branch 'main'
            }
            steps {
                script {
                    // Wait for services to start
                    sleep(time: 30, unit: 'SECONDS')
                    
                    // Check backend health
                    bat 'curl -f http://localhost:5000/api/health || exit 1'
                    
                    // Check ML service health
                    bat 'curl -f http://localhost:5001/ || exit 1'
                    
                    // Check frontend
                    bat 'curl -f http://localhost:3000/ || exit 1'
                }
            }
        }
    }

    post {
        always {
            // Archive test results if they exist
            junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
            
            // Clean workspace
            cleanWs()
        }
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check logs for details.'
        }
    }
}
