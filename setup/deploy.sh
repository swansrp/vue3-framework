

#======================= 修改这里 ============================
projectDirArray=("projectCode")
remoteDir='/usr/local/nginx/html/'
previewRemoteDir='/usr/local/nginx/html/'
sshUserName='root'
remoteAddr='152.136.57.16'
ssh_config=${sshUserName}@${remoteAddr}
#ssh_config=jenkins_backup
#======================= 修改这里 ============================

basepath=$(cd "$(dirname "$0")"; pwd)
if test -z $remoteAddr
then
read -p "要部署的ip:" remoteAddr
fi
echo "┌-----------------------------┐"
echo "|----0.projectCode-----------|"?
echo "└-----------------------------┘"
echo ""
read -p "选择要部署的项目序号:" projectIndex
remoteDir=${remoteDir}${projectDirArray[$projectIndex]}/view
previewRemoteDir=${previewRemoteDir}${projectDirArray[$projectIndex]}/view
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
	send "rm -rf ${previewRemoteDir}"
	send "mkdir -p ${previewRemoteDir}"
	
	# 上传压缩包
	scp -O ${basepath}/dist.tar.gz ${ssh_config}:"${previewRemoteDir}/"
	
	# 远程解压缩
	echo "开始解压缩..."
	send "cd ${previewRemoteDir} && tar -xzf dist.tar.gz && rm -f dist.tar.gz && mv dist/* . && rm -rf dist/"
	
	# 删除本地压缩包
	rm -f ${basepath}/dist.tar.gz
	
	echo "部署完成!"
	return 0
}

deploy() {
	if dirExsit ${remoteDir}_old/; then
		send "rm -rf ${remoteDir}_old"
	fi
	if dirExsit ${remoteDir}_backup/; then
		send "mv ${remoteDir}_backup ${remoteDir}_old"
	fi
	if dirExsit ${remoteDir}/; then
	    send "mv ${remoteDir} ${remoteDir}_backup"
	else
		send "mkdir -p ${remoteDir}"
	fi
	send "cp -r ${previewRemoteDir} ${remoteDir}"
	return 0
}

rollback(){
	if dirExsit ${remoteDir}_backup/; then
		send "rm -rf ${remoteDir}"
		send "mv ${remoteDir}_backup ${remoteDir}"
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
