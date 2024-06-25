<template>
  <a-modal
    v-model:icon="_icon"
    v-model:open="_visible"
    :footer="null"
    title="图标选择"
    width="800px"
    @cancel="closeModal">
    <a-tabs type="card">
      <a-tab-pane v-for="attr in paneAttrList" :key="attr.key" :tab="attr.tab">
        <icon-list :icons="attr.icons" @get-icon-name="getIconName" />
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script lang="ts" setup>
import IconList from "@/framework/components/common/antdIcons/IconList.vue"

const directionIcons = ["StepBackwardOutlined","StepForwardOutlined","FastBackwardOutlined","FastForwardOutlined","ShrinkOutlined","ArrowsAltOutlined","DownOutlined","UpOutlined","LeftOutlined","RightOutlined","CaretUpOutlined","CaretDownOutlined","CaretLeftOutlined","CaretRightOutlined","UpCircleOutlined","DownCircleOutlined","LeftCircleOutlined","RightCircleOutlined","DoubleRightOutlined","DoubleLeftOutlined","VerticalLeftOutlined","VerticalRightOutlined","VerticalAlignTopOutlined","VerticalAlignMiddleOutlined","VerticalAlignBottomOutlined","ForwardOutlined","BackwardOutlined","RollbackOutlined","EnterOutlined","RetweetOutlined","SwapOutlined","SwapLeftOutlined","SwapRightOutlined","ArrowUpOutlined","ArrowDownOutlined","ArrowLeftOutlined","ArrowRightOutlined","PlayCircleOutlined","UpSquareOutlined","DownSquareOutlined","LeftSquareOutlined","RightSquareOutlined","LoginOutlined","LogoutOutlined","MenuFoldOutlined","MenuUnfoldOutlined","BorderBottomOutlined","BorderHorizontalOutlined","BorderInnerOutlined","BorderOuterOutlined","BorderLeftOutlined","BorderRightOutlined","BorderTopOutlined","BorderVerticleOutlined","PicCenterOutlined","PicLeftOutlined","PicRightOutlined","RadiusBottomleftOutlined","RadiusBottomrightOutlined","RadiusUpleftOutlined","RadiusUprightOutlined","FullscreenOutlined","FullscreenExitOutlined"]
const suggestionIcons = ['QuestionCircleOutlined', 'PlusOutlined', 'PlusCircleOutlined', 'PauseOutlined', 'PauseCircleOutlined', 'MinusOutlined', 'MinusCircleOutlined', 'PlusSquareOutlined', 'MinusSquareOutlined', 'InfoOutlined', 'InfoCircleOutlined', 'ExclamationOutlined', 'ExclamationCircleOutlined', 'CloseOutlined', 'CloseCircleOutlined', 'CloseSquareOutlined', 'CheckOutlined', 'CheckCircleOutlined', 'CheckSquareOutlined', 'ClockCircleOutlined', 'WarningOutlined', 'IssuesCloseOutlined', 'StopOutlined']
const editIcons = ['EditOutlined', 'FormOutlined', 'CopyOutlined', 'ScissorOutlined', 'DeleteOutlined', 'SnippetsOutlined', 'DiffOutlined', 'HighlightOutlined', 'AlignCenterOutlined', 'AlignLeftOutlined', 'AlignRightOutlined', 'BgColorsOutlined', 'BoldOutlined', 'ItalicOutlined', 'UnderlineOutlined', 'StrikethroughOutlined', 'RedoOutlined', 'UndoOutlined', 'ZoomInOutlined', 'ZoomOutOutlined', 'FontColorsOutlined', 'FontSizeOutlined', 'LineHeightOutlined', 'ColumnHeightOutlined', 'DashOutlined', 'SmallDashOutlined', 'SortAscendingOutlined', 'SortDescendingOutlined', 'DragOutlined', 'OrderedListOutlined', 'RadiusSettingOutlined']
const dataIcons = ['AreaChartOutlined', 'PieChartOutlined', 'BarChartOutlined', 'DotChartOutlined', 'LineChartOutlined', 'RadarChartOutlined', 'HeatMapOutlined', 'FallOutlined', 'RiseOutlined', 'StockOutlined', 'BoxPlotOutlined', 'FundOutlined', 'SlidersOutlined']
const webIcons = ["AccountBookOutlined","AimOutlined","AlertOutlined","ApartmentOutlined","ApiOutlined","AppstoreAddOutlined","AppstoreOutlined","AudioOutlined","AudioMutedOutlined","AuditOutlined","BankOutlined","BarcodeOutlined","BarsOutlined","BellOutlined","BlockOutlined","BookOutlined","BorderOutlined","BorderlessTableOutlined","BranchesOutlined","BugOutlined","BuildOutlined","BulbOutlined","CalculatorOutlined","CalendarOutlined","CameraOutlined","CarOutlined","CarryOutOutlined","CiCircleOutlined","CiOutlined","ClearOutlined","CloudDownloadOutlined","CloudOutlined","CloudServerOutlined","CloudSyncOutlined","CloudUploadOutlined","ClusterOutlined","CodeOutlined","CoffeeOutlined","CommentOutlined","CompassOutlined","CompressOutlined","ConsoleSqlOutlined","ContactsOutlined","ContainerOutlined","ControlOutlined","CopyrightCircleOutlined","CopyrightOutlined","CreditCardOutlined","CrownOutlined","CustomerServiceOutlined","DashboardOutlined","DatabaseOutlined","DeleteColumnOutlined","DeleteRowOutlined","DeliveredProcedureOutlined","DeploymentUnitOutlined","DesktopOutlined","DingtalkOutlined","DisconnectOutlined","DislikeOutlined","DollarCircleOutlined","DollarOutlined","DownloadOutlined","EllipsisOutlined","EnvironmentOutlined","EuroCircleOutlined","EuroOutlined","ExceptionOutlined","ExpandAltOutlined","ExpandOutlined","ExperimentOutlined","ExportOutlined","EyeOutlined","EyeInvisibleOutlined","FieldBinaryOutlined","FieldNumberOutlined","FieldStringOutlined","FieldTimeOutlined","FileAddOutlined","FileDoneOutlined","FileExcelOutlined","FileExclamationOutlined","FileOutlined","FileGifOutlined","FileImageOutlined","FileJpgOutlined","FileMarkdownOutlined","FilePdfOutlined","FilePptOutlined","FileProtectOutlined","FileSearchOutlined","FileSyncOutlined","FileTextOutlined","FileUnknownOutlined","FileWordOutlined","FileZipOutlined","FilterOutlined","FireOutlined","FlagOutlined","FolderAddOutlined","FolderOutlined","FolderOpenOutlined","FolderViewOutlined","ForkOutlined","FormatPainterOutlined","FrownOutlined","FunctionOutlined","FundProjectionScreenOutlined","FundViewOutlined","FunnelPlotOutlined","GatewayOutlined","GifOutlined","GiftOutlined","GlobalOutlined","GoldOutlined","GroupOutlined","HddOutlined","HeartOutlined","HistoryOutlined","HolderOutlined","HomeOutlined","HourglassOutlined","IdcardOutlined","ImportOutlined","InboxOutlined","InsertRowAboveOutlined","InsertRowBelowOutlined","InsertRowLeftOutlined","InsertRowRightOutlined","InsuranceOutlined","InteractionOutlined","KeyOutlined","LaptopOutlined","LayoutOutlined","LikeOutlined","LineOutlined","LinkOutlined","Loading3QuartersOutlined","LoadingOutlined","LockOutlined","MacCommandOutlined","MailOutlined","ManOutlined","MedicineBoxOutlined","MehOutlined","MenuOutlined","MergeCellsOutlined","MessageOutlined","MobileOutlined","MoneyCollectOutlined","MonitorOutlined","MoreOutlined","NodeCollapseOutlined","NodeExpandOutlined","NodeIndexOutlined","NotificationOutlined","NumberOutlined","OneToOneOutlined","PaperClipOutlined","PartitionOutlined","PayCircleOutlined","PercentageOutlined","PhoneOutlined","PictureOutlined","PlaySquareOutlined","PoundCircleOutlined","PoundOutlined","PoweroffOutlined","PrinterOutlined","ProfileOutlined","ProjectOutlined","PropertySafetyOutlined","PullRequestOutlined","PushpinOutlined","QrcodeOutlined","ReadOutlined","ReconciliationOutlined","RedEnvelopeOutlined","ReloadOutlined","RestOutlined","RobotOutlined","RocketOutlined","RotateLeftOutlined","RotateRightOutlined","SafetyCertificateOutlined","SafetyOutlined","SaveOutlined","ScanOutlined","ScheduleOutlined","SearchOutlined","SecurityScanOutlined","SelectOutlined","SendOutlined","SettingOutlined","ShakeOutlined","ShareAltOutlined","ShopOutlined","ShoppingCartOutlined","ShoppingOutlined","SisternodeOutlined","SkinOutlined","SmileOutlined","SolutionOutlined","SoundOutlined","SplitCellsOutlined","StarOutlined","SubnodeOutlined","SwitcherOutlined","SyncOutlined","TableOutlined","TabletOutlined","TagOutlined","TagsOutlined","TeamOutlined","ThunderboltOutlined","ToTopOutlined","ToolOutlined","TrademarkCircleOutlined","TrademarkOutlined","TransactionOutlined","TranslationOutlined","TrophyOutlined","UngroupOutlined","UnlockOutlined","UploadOutlined","UsbOutlined","UserAddOutlined","UserDeleteOutlined","UserOutlined","UserSwitchOutlined","UsergroupAddOutlined","UsergroupDeleteOutlined","VerifiedOutlined","VideoCameraAddOutlined","VideoCameraOutlined","WalletOutlined","WhatsAppOutlined","WifiOutlined","WomanOutlined"]
const logoIcons = ['AndroidOutlined', 'AppleOutlined', 'WindowsOutlined', 'IeOutlined', 'ChromeOutlined', 'GithubOutlined', 'AliwangwangOutlined', 'DingdingOutlined', 'WeiboSquareOutlined', 'WeiboCircleOutlined', 'TaobaoCircleOutlined', 'Html5Outlined', 'WeiboOutlined', 'TwitterOutlined', 'WechatOutlined', 'YoutubeOutlined', 'AlipayCircleOutlined', 'TaobaoOutlined', 'SkypeOutlined', 'QqOutlined', 'MediumWorkmarkOutlined', 'GitlabOutlined', 'MediumOutlined', 'LinkedinOutlined', 'GooglePlusOutlined', 'DropboxOutlined', 'FacebookOutlined', 'CodepenOutlined', 'AmazonOutlined', 'GoogleOutlined', 'CodepenCircleOutlined', 'AlipayOutlined', 'AntDesignOutlined', 'AliyunOutlined', 'ZhihuOutlined', 'SlackOutlined', 'SlackSquareOutlined', 'BehanceOutlined', 'BehanceSquareOutlined', 'DribbbleOutlined', 'DribbbleSquareOutlined', 'InstagramOutlined', 'YuqueOutlined', 'AlibabaOutlined', 'YahooOutlined']
const paneAttrList:{key: string, tab: any, icons:Array<string>}[] = [
  {key: "directionIcons", tab: "方向性图标", icons: directionIcons},
  {key: "suggestionIcons", tab: "指示性图标", icons: suggestionIcons},
  {key: "editIcons", tab: "编辑类图标", icons: editIcons},
  {key: "dataIcons", tab: "数据类图标", icons: dataIcons},
  {key: "webIcons", tab: "网站通用图标", icons: webIcons},
  {key: "logoIcons", tab: "品牌和标识", icons: logoIcons}
]

let _icon = ref('')
let _visible = ref(false)
const props = defineProps<{ visible: boolean, icon: string }>()
const emits = defineEmits(['update:visible', 'update:icon'])

const getIconName = (iconName: string) => {
  _icon.value = iconName
  _visible.value = false
  emits('update:icon', iconName)
  emits('update:visible', false)
}

const closeModal = () => {
  _visible.value = false
  emits('update:visible', false)
}

watch(() => props.visible, (value) => _visible.value = value, {immediate: true})

</script>
