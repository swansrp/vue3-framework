

#======================= 修改这里 ============================
projectDir='view'
projectDirArray=("projectCode")
remoteDir='/usr/local/nginx/html/'
previewRemoteDir='/usr/local/nginx/html/'
sshUserName='root'
remoteAddr='152.136.57.16'
ssh_config=${sshUserName}@${remoteAddr}
#ssh_config=jenkins_backup
#======================= 修改这里 ============================

basepath=$(cd "$(dirname "$0")"; pwd)
if [[ $# -ne 0 ]] ; then
echo "要部署的项目:$1"
projectDir=$1
fi
if test -z $remoteAddr
then
read -p "要部署的ip:" remoteAddr
fi
echo "┌-----------------------------┐"
echo "|----0.projectCode------------|"
echo "└-----------------------------┘"
echo ""
read -p "选择要部署的项目序号:" projectIndex
projectDir=${projectDirArray[$projectIndex]}
remoteDir=${remoteDir}${projectDirArray[$projectIndex]}
previewRemoteDir=${previewRemoteDir}${projectDirArray[$projectIndex]}
echo "要部署的项目: ${projectDirArray[$projectIndex]}"


send() {
	ssh ${ssh_config} $1
	return $?
}
dirExsit() {
	if ssh ${ssh_config} test -d $1; then
		return 0
	else
		return 1
	fi
}



preview(){
	if ! test -d ${basepath}/dist/; then
		echo "部署文件不存在"
		return 0;
	fi
	
	echo "开始压缩文件..."
	# 删除旧的压缩包
	if test -f ${basepath}/dist.tar.gz; then
		rm -f ${basepath}/dist.tar.gz
	fi
	
	# 压缩 dist 目录
	cd ${basepath}
	tar -czf dist.tar.gz dist/
	cd - > /dev/null
	
	echo "压缩完成,开始上传..."
	# 清理远程预览目录
	send "rm -rf ${previewRemoteDir}-${projectDir}"
	send "mkdir -p ${previewRemoteDir}-${projectDir}"
	
	# 上传压缩包
	scp -O ${basepath}/dist.tar.gz ${ssh_config}:"${previewRemoteDir}-${projectDir}/"
	
	# 远程解压缩
	echo "开始解压缩..."
	send "cd ${previewRemoteDir}-${projectDir} && tar -xzf dist.tar.gz && rm -f dist.tar.gz && mv dist/* . && rm -rf dist/"
	
	# 删除本地压缩包
	rm -f ${basepath}/dist.tar.gz
	
	echo "部署完成!"
	return 0
}

deploy() {
	if dirExsit ${previewRemoteDir}-${projectDir}_old/; then
		send "rm -rf ${previewRemoteDir}-${projectDir}_old"
	fi
	if dirExsit ${previewRemoteDir}-${projectDir}_backup/; then
		send "mv ${previewRemoteDir}-${projectDir}_backup ${previewRemoteDir}-${projectDir}_old"
	fi
	if dirExsit ${remoteDir}-${projectDir}/; then
	    send "mv ${remoteDir}-${projectDir} ${previewRemoteDir}-${projectDir}_backup"
	else
		send "mkdir -p ${remoteDir}-${projectDir}"
	fi
	send "cp -r ${previewRemoteDir}-${projectDir} ${remoteDir}"
	return 0
}

rollback(){
	if dirExsit ${previewRemoteDir}-${projectDir}_backup/; then
		send "rm -rf ${remoteDir}-${projectDir}"
		send "mv ${previewRemoteDir}-${projectDir}_backup ${previewRemoteDir}-${projectDir}"
	else
		echo "没有备份 回退失败"
	fi
	return 0
}


echo "┌-----------------------┐"
echo "|----0. preview---------|"
echo "|----1. deploy----------|"
echo "|----2. rollback--------|"
echo "└-----------------------┘"
echo ""
echo "input your operation"
read option

case $option in
0)  preview
	;;
1)
	deploy
    ;;
2)
	rollback
    ;;
esac
