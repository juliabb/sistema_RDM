pipeline {
    agent any
    environment {
        /* Servidor remoto onde o deploy será feito */
        DOCKER_NODE = "JERSEY"
        DOCKER_STORAGE = "JERSEY"
        DEPLOY_DIR  = "/opt/RDM"
        DEPLOY_STORAGE ="/opt/RDM/front" 
                }
    stages{
         
         stage('SSH transfer') {
            steps([$class: 'BapSshPromotionPublisherPlugin']) {
                sshPublisher(
                    continueOnError: false, failOnError: true,
                    publishers: [
                        sshPublisherDesc(
                            configName: "$DOCKER_STORAGE",
                            verbose: true,
                            transfers: [
                                sshTransfer(
                                    execCommand: "mkdir -p $DEPLOY_STORAGE"
                                        ),
                                sshTransfer(
                                    sourceFiles: "**/**/**/**/**",
                                    removePrefix: "",
                                    remoteDirectory: "$DEPLOY_STORAGE"
 )
                            ]
                        )
                    ]
                )
            }
        }
        stage('Deploy image') {
            steps([$class: 'BapSshPromotionPublisherPlugin']) {
                sshPublisher(
                    continueOnError: false, failOnError: true,
                    publishers: [
                        sshPublisherDesc(
                            configName: "$DOCKER_NODE",
                            verbose: true,
                            transfers: [
                                sshTransfer(
                            execCommand: "sleep 2 && cd /opt/RDM && docker compose build --no-cache && docker compose up -d --force-recreate"
                                ),
                                sshTransfer(
                                    execCommand: "ls"
                                )
                          ]
                        )
                    ]
                )
            }
        }
    }
}
