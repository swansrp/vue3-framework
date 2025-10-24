<template>
  <div class="login-box fullscreen-bg">
    <div class="login-container">
      <div class="login-logo">
        <img
          :width="40"
          alt="登录图案"
          src="../../../assets/image/login/logo.png"
          class="logo-img"
        />
        <h1 class="login-title">
          {{ title }}
        </h1>
      </div>
      <a-form
        v-if="passwordResetMode"
        :model="passwordResetForm"
        :label-col="{ span: 24 }"
        :wrapper-col="{ span: 24 }"
        layout="vertical"
        class="password-reset-form"
        autocomplete="off"
        @finish="handleInitPassword"
      >
        <div class="login-content-wrapper">
          <a-form-item
            :rules="[{ validator: passwordResetValidator, trigger: 'change' }]"
            has-feedback
            label="输入密码："
            name="password"
          >
            <a-input-password
              v-model:value="passwordResetForm.password"
              autocomplete="new-password"
              placeholder="至少8位，需含数字和字母"
              size="large"
              type="password"
            />
          </a-form-item>
          <a-form-item
            :rules="[
              {
                required: true,
                message: '两次密码不一致',
                pattern: new RegExp('^' + passwordResetForm.password + '$'),
              },
            ]"
            has-feedback
            label="确认密码："
            name="passwordConfirm"
          >
            <a-input-password
              v-model:value="passwordResetForm.passwordConfirm"
              autocomplete="new-password"
              placeholder="请再次输入密码"
              size="large"
              type="password"
            />
          </a-form-item>
          <a-form-item
            :rules="[{ required: true, message: '请输入验证码' }]"
            label="验证码："
            name="captcha"
          >
            <a-input
              v-model:value="passwordResetForm.captcha"
              :maxlength="4"
              autocomplete="off"
              placeholder="验证码"
              size="large"
            >
              <template #suffix>
                <img
                  :height="40"
                  :src="captchaUrl"
                  alt="验证码"
                  class="absolute right-0 h-full cursor-pointer"
                  @click="updateCaptchaUrl('INIT_PASSWORD_CAPTCHA')"
                />
              </template>
            </a-input>
          </a-form-item>
          <a-form-item>
            <a-button
              :loading="loading"
              block
              html-type="submit"
              size="large"
              type="primary"
            >
              设置密码并登录
            </a-button>
          </a-form-item>
        </div>
      </a-form>
      <template v-else-if="registerMode">
        <div class="login-content-wrapper">
          <!-- 注册页面标题，与登录页面的 tabs 对齐 -->
          <div class="register-header">
            <div class="register-title">注册账号</div>
          </div>
          <msg-code
            v-if="registerWithPhoneNumber"
            v-model:form-data="registerForm"
            :finish="handleMsgRegister"
            :phone-number-existed="false"
            :show-label="false"
            form-class="register-form"
            sms-type="REGISTER_MSG_CODE"
            submit-text="注册并登录"
          >
            <a-form-item
              :rules="[
                { required: true, message: '请输入用户名!', trigger: 'change' },
                { validator: userNameValidator, trigger: 'blur' },
              ]"
              name="userName"
            >
              <a-input
                v-model:value="registerForm.loginId"
                autocomplete="off"
                name="username-register-msg"
                placeholder="请输入用户名"
                readonly
                size="large"
                @focus="removeReadonly"
              >
                <template #prefix>
                  <user-outlined />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item
              :rules="[{ validator: passwordLoginValidator, trigger: 'change' }]"
              has-feedback
              name="password"
            >
              <a-input-password
                v-model:value="registerForm.password"
                autocomplete="new-password"
                name="password-register-msg"
                placeholder="至少8位，需含数字和字母"
                readonly
                size="large"
                type="password"
                @focus="removeReadonly"
              >
                <template #prefix>
                  <SafetyOutlined />
                </template>
              </a-input-password>
            </a-form-item>
            <template #footer>
              <div style="display: flex; justify-content: flex-end; margin-top: -5px">
                <a-button class="login-mode-btn" type="text" @click="changeToLoginMode">
                  已有账号
                </a-button>
              </div>
            </template>
          </msg-code>
          <a-form
            v-else
            :model="registerForm"
            layout="horizontal"
            class="register-form"
            autocomplete="off"
            @finish="handleRegister"
          >
            <a-form-item
              :rules="[
                { required: true, message: '请输入用户名!', trigger: 'change' },
                { validator: userNameValidator, trigger: 'blur' },
              ]"
              name="loginId"
            >
              <a-input
                v-model:value="registerForm.loginId"
                autocomplete="off"
                name="username-new"
                placeholder="请输入用户名"
                readonly
                size="large"
                @focus="removeReadonly"
              >
                <template #prefix>
                  <user-outlined />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item
              :rules="[{ validator: passwordLoginValidator, trigger: 'change' }]"
              has-feedback
              name="password"
            >
              <a-input-password
                v-model:value="registerForm.password"
                autocomplete="new-password"
                name="password-new"
                placeholder="至少8位，需含数字和字母"
                readonly
                size="large"
                type="password"
                @focus="removeReadonly"
              >
                <template #prefix>
                  <SafetyOutlined />
                </template>
              </a-input-password>
            </a-form-item>
            <a-form-item
              :rules="[{ required: true, message: '请输入验证码' }]"
              name="captcha"
            >
              <a-input
                v-model:value="registerForm.captcha"
                :maxlength="4"
                autocomplete="off"
                placeholder="验证码"
                size="large"
              >
                <template #suffix>
                  <img
                    :height="40"
                    :src="captchaUrl"
                    alt="验证码"
                    class="absolute right-0 h-full cursor-pointer"
                    @click="updateCaptchaUrl('REGISTER_CAPTCHA')"
                  />
                </template>
              </a-input>
            </a-form-item>
            <a-form-item>
              <a-button
                :loading="loading"
                block
                html-type="submit"
                size="large"
                class="register-submit-btn"
                type="primary"
              >
                注册并登录
              </a-button>
            </a-form-item>
          </a-form>
          <div class="login-footer-links">
            <a-button class="login-mode-btn" type="text" @click="changeToLoginMode">
              已有账号
            </a-button>
          </div>
        </div>
      </template>
      <div v-else class="login-content-wrapper">
        <a-tabs v-model:active-key="activeKey" class="login-tabs">
          <a-tab-pane key="1" tab="账号登录">
            <a-form
              :model="formInline"
              layout="horizontal"
              autocomplete="off"
              @finish="handleSubmit"
            >
              <a-form-item
                :rules="[{ required: true, message: '请输入用户名!', trigger: 'change' }]"
                name="userName"
              >
                <a-input
                  v-model:value="formInline.userName"
                  autocomplete="off"
                  name="username-login"
                  placeholder="用户名"
                  size="large"
                >
                  <template #prefix>
                    <user-outlined />
                  </template>
                </a-input>
              </a-form-item>
              <a-form-item
                :rules="[{ required: true, message: '请输入密码!', trigger: 'change' }]"
                name="password"
              >
                <a-input-password
                  v-model:value="formInline.password"
                  autocomplete="new-password"
                  name="password-login"
                  placeholder="密码"
                  size="large"
                  type="password"
                >
                  <template #prefix>
                    <lock-outlined />
                  </template>
                </a-input-password>
              </a-form-item>
              <a-form-item
                :rules="[{ required: true, message: '请输入验证码!', trigger: 'change' }]"
                name="captcha"
              >
                <a-input
                  v-model:value="formInline.captcha"
                  :maxlength="4"
                  autocomplete="off"
                  placeholder="验证码"
                  size="large"
                >
                  <template #prefix>
                    <SafetyOutlined />
                  </template>
                  <template #suffix>
                    <img
                      :height="40"
                      :src="captchaUrl"
                      alt="验证码"
                      class="absolute right-0 h-full cursor-pointer"
                      @click="updateCaptchaUrl('LOGIN_CAPTCHA')"
                    />
                  </template>
                </a-input>
              </a-form-item>
              <a-form-item>
                <a-button
                  :loading="loading"
                  block
                  html-type="submit"
                  size="large"
                  type="primary"
                >
                  登录
                </a-button>
              </a-form-item>
            </a-form>
          </a-tab-pane>
          <a-tab-pane key="2" tab="手机登录">
            <msg-code
              :key="msgCodeKey"
              v-model:form-data="msgLoginForm"
              :finish="handleMsgLogin"
              :phone-number-existed="registerWithPhoneNumber ? undefined : true"
              sms-type="LOGIN_MSG_CODE"
            />
          </a-tab-pane>
        </a-tabs>
        <div class="login-footer-links">
          <a-button
            class="login-mode-btn"
            type="text"
            @click="
              () => {
                registerMode = true;
                updateCaptchaUrl('REGISTER_CAPTCHA');
              }
            "
          >
            还没有账号
          </a-button>
        </div>
      </div>
    </div>
    <copyright-icp />
  </div>
</template>

<script lang="ts" setup>
import { LockOutlined, SafetyOutlined, UserOutlined } from "@ant-design/icons-vue";
import { Md5 } from "ts-md5";
import { reactive, Ref } from "vue";
import { useRouter } from "vue-router";

import { userAlreadyExisted } from "@/framework/apis/admin/user";
import {
  getToken,
  initPasswordAndLogin,
  login,
  msgCodeLogin,
  msgCodeRegister,
  passwordRegister,
} from "@/framework/apis/login/login";
import CopyrightIcp from "@/framework/components/common/copyrightIcp/index.vue";
import MsgCode from "@/framework/components/common/msgCode/index.vue";
import { checkLoginState } from "@/framework/network/login";
import { baseURL } from "@/framework/network/request";
import { parameterStore } from "@/framework/store/common";
import { localStorageMethods } from "@/framework/utils/common";
import { AUTHORIZATION_TOKEN, REFRESH_TOKEN } from "@/framework/utils/constant";

const activeKey = ref("1");

const title: Ref<string> = ref(document.title);
const router = useRouter();
let captchaUrl: Ref<string> = ref("");
let loading: Ref<boolean> = ref(false);
const formInline = reactive({ userName: "", password: "", captcha: "" });
const passwordResetMode: Ref<Boolean> = ref(false);
const passwordResetForm = reactive({ password: "", passwordConfirm: "", captcha: "" });
const registerMode: Ref<Boolean> = ref(false);
let registerForm = reactive({
  phoneNumber: "",
  msgCode: "",
  captcha: "",
  loginId: "",
  password: "",
});
const registerWithPhoneNumber: Ref<boolean> = ref(false);
let msgLoginForm = reactive({ phoneNumber: "", msgCode: "", captcha: "" });
const msgCodeKey = ref(0);
const getCaptchaUrl = (captchaType: string) =>
  baseURL +
  "/captcha.jpg?token=" +
  localStorageMethods.getLocalStorage(AUTHORIZATION_TOKEN) +
  "&captchaType=" +
  captchaType;
const updateCaptchaUrl = (captchaType: string) =>
  (captchaUrl.value = getCaptchaUrl(captchaType) + "&r=" + Math.random());

// 移除 readonly 属性以阻止浏览器自动填充
const removeReadonly = (event: FocusEvent) => {
  const target = event.target as HTMLInputElement;
  if (target) {
    target.removeAttribute("readonly");
  }
};

const recoveryFun = (captchaType: string) => {
  registerMode.value = false;
  updateCaptchaUrl(captchaType);
  loading.value = false;
};

const userNameValidator = () => {
  if (isNotEmpty(registerForm.loginId)) {
    return userAlreadyExisted(
      undefined,
      undefined,
      registerForm.loginId,
      undefined,
      undefined
    );
  } else {
    return Promise.reject("请输入用户名!");
  }
};

const handleSubmit = () => {
  const { userName, password, captcha } = formInline;
  let captchaType = "LOGIN_CAPTCHA";
  loading.value = true;
  login(captcha, userName, Md5.hashStr(password))
    .then((res) => {
      afterLogin(res);
    })
    .catch((err) => {
      if (err.message === "AC_PASSWORD_NOT_EXISTED") {
        passwordResetMode.value = true;
        title.value = "首次登录-设置密码";
        captchaType = "INIT_PASSWORD_CAPTCHA";
      }
      recoveryFun(captchaType);
    });
};
const handleRegister = () => {
  const { loginId, password, captcha } = registerForm;
  loading.value = true;
  return passwordRegister(captcha, loginId, Md5.hashStr(password))
    .then((res) => {
      afterLogin(res);
    })
    .catch(() => {
      recoveryFun("LOGIN_CAPTCHA");
    });
};
const handleMsgRegister = (data: any) => {
  loading.value = true;
  return msgCodeRegister(data)
    .then((res) => {
      afterLogin(res);
    })
    .catch(() => {
      recoveryFun("LOGIN_CAPTCHA");
    });
};
const handleMsgLogin = (data: any) => {
  loading.value = true;
  return msgCodeLogin(data.phoneNumber, data.msgCode)
    .then((res) => {
      afterLogin(res);
    })
    .catch(() => {
      msgCodeKey.value = msgCodeKey.value + 1;
    });
};

const afterLogin = (res: any) => {
  const route = router.currentRoute.value;
  const redirect_uri = route.query
    ? route.query.redirect_uri
      ? "/" + route.query.redirect_uri
      : undefined
    : undefined;

  // 创建现代化成功提示
  const successElement = document.createElement("div");
  successElement.innerHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: linear-gradient(145deg, 
        rgba(15, 30, 60, 0.95) 0%,
        rgba(20, 35, 70, 0.92) 50%,
        rgba(25, 40, 75, 0.95) 100%);
      backdrop-filter: blur(25px);
      -webkit-backdrop-filter: blur(25px);
      border: 2px solid rgba(100, 255, 218, 0.6);
      border-radius: 20px;
      padding: 40px 50px;
      box-shadow: 
        0 25px 80px rgba(0, 0, 0, 0.6),
        0 0 60px rgba(100, 255, 218, 0.3),
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        inset 0 -1px 0 rgba(100, 255, 218, 0.4);
      text-align: center;
      animation: successSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      min-width: 280px;
    ">
      <div style="
        width: 60px;
        height: 60px;
        margin: 0 auto 20px;
        background: linear-gradient(135deg, 
          rgba(100, 255, 218, 0.2) 0%,
          rgba(0, 255, 255, 0.1) 100%);
        border: 2px solid rgba(100, 255, 218, 0.8);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, 
            transparent,
            rgba(100, 255, 218, 0.3),
            transparent);
          animation: scanGlow 2s ease-in-out infinite;
        "></div>
        <div style="
          font-size: 28px;
          color: rgba(100, 255, 218, 1);
          font-weight: bold;
          text-shadow: 
            0 0 10px rgba(100, 255, 218, 0.8),
            0 2px 4px rgba(0, 0, 0, 0.5);
          z-index: 2;
        ">✓</div>
      </div>
      <div style="
        font-size: 22px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 12px;
        text-shadow: 
          0 2px 8px rgba(0, 0, 0, 0.6),
          0 0 20px rgba(100, 255, 218, 0.3);
        letter-spacing: 1px;
      ">登录成功</div>
      <div style="
        font-size: 14px;
        color: rgba(100, 255, 218, 0.9);
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
        font-weight: 500;
      ">正在跳转到系统主页...</div>
      <div style="
        margin-top: 20px;
        height: 3px;
        background: rgba(100, 255, 218, 0.2);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div style="
          height: 100%;
          width: 100%;
          background: linear-gradient(90deg, 
            rgba(100, 255, 218, 0.8),
            rgba(0, 255, 255, 1),
            rgba(100, 255, 218, 0.8));
          border-radius: 2px;
          animation: progressFlow 2s ease-in-out infinite;
        "></div>
      </div>
    </div>
  `;

  // 添加动画样式
  const style = document.createElement("style");
  style.textContent = `
    @keyframes successSlideIn {
      0% {
        opacity: 0;
        transform: translate(-50%, -60%) scale(0.8) rotateY(20deg);
      }
      100% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1) rotateY(0deg);
      }
    }
    
    @keyframes scanGlow {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    
    @keyframes progressFlow {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(successElement);

  // 保存登录信息
  const { accessToken, refreshToken } = res.payload;
  localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, accessToken);
  localStorageMethods.setLocalStorage(REFRESH_TOKEN, refreshToken);
  loading.value = false;

  // 2.5秒后开始退场动画，完成后再跳转页面
  setTimeout(() => {
    if (successElement.parentNode) {
      successElement.style.animation =
        "successSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) reverse";
      setTimeout(() => {
        if (successElement.parentNode) {
          document.body.removeChild(successElement);
        }
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
        // 确保提示完全消失后再进行页面跳转
        setTimeout(() => {
          checkLoginState()
            .then(() => {
              router.replace(redirect_uri || "/");
            })
            .catch(() => {
              // 如果登录状态检查失败，直接跳转
              router.replace(redirect_uri || "/");
            });
        }, 100);
      }, 400);
    } else {
      // 如果元素已经被移除，直接跳转
      setTimeout(() => {
        checkLoginState()
          .then(() => {
            router.replace(redirect_uri || "/");
          })
          .catch(() => {
            router.replace(redirect_uri || "/");
          });
      }, 100);
    }
  }, 2500);
};

const handleInitPassword = () => {
  loading.value = true;
  const { password, passwordConfirm, captcha } = passwordResetForm;
  const { userName } = formInline;
  initPasswordAndLogin(
    userName,
    Md5.hashStr(password),
    Md5.hashStr(passwordConfirm),
    captcha
  )
    .then((res) => {
      afterLogin(res);
    })
    .catch(() => {
      passwordResetMode.value = false;
      title.value = document.title;
      recoveryFun("LOGIN_CAPTCHA");
    });
};

const passwordResetValidator = () => {
  return lxStr(passwordResetForm.password);
};

const passwordLoginValidator = () => {
  return lxStr(registerForm.password);
};

// 判断密码强度和安全性
const lxStr = (password: string) => {
  console.log("lxStr", password);
  if (isEmpty(password)) {
    return Promise.reject("请输入密码");
  }

  // 密码长度至少8位
  if (password.length < 8) {
    return Promise.reject("密码长度至少8位");
  }

  // 检查是否包含数字
  const hasNumber = /[0-9]/.test(password);
  // 检查是否包含字母
  const hasLetter = /[a-zA-Z]/.test(password);

  // 必须同时包含数字和字母
  if (!hasNumber || !hasLetter) {
    return Promise.reject("密码必须包含数字和字母");
  }

  // 检查是否有3位相同的字符
  let arr = password.split("");
  for (let i = 0; i < arr.length - 2; i++) {
    if (arr[i] === arr[i + 1] && arr[i + 1] === arr[i + 2]) {
      return Promise.reject("密码不能包含3位相同的字符");
    }
  }

  // 检查是否有3位连续的数字或字母
  for (let i = 0; i < arr.length - 2; i++) {
    let firstCode = arr[i].charCodeAt(0);
    let secondCode = arr[i + 1].charCodeAt(0);
    let thirdCode = arr[i + 2].charCodeAt(0);

    // 检查递增连续（如123, abc）
    if (secondCode - firstCode === 1 && thirdCode - secondCode === 1) {
      return Promise.reject("密码不能包含3位连续的字符");
    }

    // 检查递减连续（如321, cba）
    if (firstCode - secondCode === 1 && secondCode - thirdCode === 1) {
      return Promise.reject("密码不能包含3位连续的字符");
    }
  }

  return Promise.resolve();
};

const changeToLoginMode = () => {
  registerMode.value = false;
  updateCaptchaUrl("LOGIN_CAPTCHA");
};

onBeforeMount(() =>
  getToken().then((res) => {
    const { token } = res.payload;
    localStorageMethods.setLocalStorage(AUTHORIZATION_TOKEN, token);
    updateCaptchaUrl("LOGIN_CAPTCHA");
  })
);
onMounted(() => {
  parameterStore()
    .getParameter("PHONE_NUMBER_REGISTER")
    .then((resp) => {
      registerWithPhoneNumber.value = resp === "1";
    });
});
</script>

<style lang="less" scoped>
.fullscreen-bg {
  background-image: url("../../../assets/image/login/backgroud.jpg");
  background-position: center center;
  background-repeat: no-repeat;
  background-size: cover;
  min-height: 100vh;
  height: 100%;
  position: relative;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      135deg,
      rgba(0, 30, 60, 0.15) 0%,
      rgba(20, 40, 80, 0.12) 25%,
      rgba(10, 35, 70, 0.18) 50%,
      rgba(25, 45, 85, 0.1) 75%,
      rgba(5, 25, 55, 0.2) 100%
    );
    animation: subtleGlow 12s ease-in-out infinite alternate;
    z-index: -3; // 确保在最底层
    pointer-events: none; // 禁止鼠标事件
  }

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 30% 30%,
        rgba(100, 255, 218, 0.03) 0%,
        transparent 50%
      ),
      radial-gradient(circle at 70% 70%, rgba(0, 191, 255, 0.02) 0%, transparent 50%),
      radial-gradient(circle at 50% 20%, rgba(64, 224, 208, 0.04) 0%, transparent 60%);
    z-index: -2; // 确保在底层
    pointer-events: none; // 禁止鼠标事件
  }
}

@keyframes subtleGlow {
  0% {
    background: linear-gradient(
      135deg,
      rgba(0, 30, 60, 0.15) 0%,
      rgba(20, 40, 80, 0.12) 25%,
      rgba(10, 35, 70, 0.18) 50%,
      rgba(25, 45, 85, 0.1) 75%,
      rgba(5, 25, 55, 0.2) 100%
    );
  }
  100% {
    background: linear-gradient(
      135deg,
      rgba(5, 35, 65, 0.18) 0%,
      rgba(15, 35, 75, 0.15) 25%,
      rgba(8, 30, 65, 0.2) 50%,
      rgba(20, 40, 80, 0.12) 75%,
      rgba(0, 28, 58, 0.22) 100%
    );
  }
}

@keyframes scanLine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

@keyframes borderGlow {
  0% {
    opacity: 0.6;
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    filter: blur(1px);
  }
}

// 移除静态背景注释，添加科技感动画

.login-box {
  display: flex;
  padding: 2vh 1rem;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;

  .login-container {
    width: 100%;
    max-width: 425px;
    min-height: 480px;
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    background: linear-gradient(
      145deg,
      rgba(30, 45, 70, 0.85) 0%,
      rgba(40, 55, 80, 0.8) 50%,
      rgba(35, 50, 75, 0.82) 100%
    );
    border: 2px solid;
    border-image: linear-gradient(
        145deg,
        rgba(255, 180, 120, 0.6) 0%,
        rgba(255, 200, 140, 0.4) 25%,
        rgba(255, 220, 160, 0.3) 50%,
        rgba(255, 200, 140, 0.4) 75%,
        rgba(255, 180, 120, 0.6) 100%
      )
      1;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px rgba(255, 180, 120, 0.2),
      inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(255, 180, 120, 0.3);
    border-radius: 20px;
    overflow: hidden;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;

    &::before {
      content: "";
      position: absolute;
      top: -2px;
      left: -2px;
      right: -2px;
      bottom: -2px;
      background: linear-gradient(
        45deg,
        rgba(255, 180, 120, 0.8) 0%,
        rgba(255, 200, 140, 0.6) 25%,
        rgba(255, 220, 160, 0.4) 50%,
        rgba(255, 200, 140, 0.6) 75%,
        rgba(255, 180, 120, 0.8) 100%
      );
      border-radius: 22px;
      z-index: -2;
      animation: borderGlow 3s ease-in-out infinite alternate;
      pointer-events: none;
    }

    &:hover {
      transform: translateY(-5px) scale(1.01);
      box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5), 0 0 50px rgba(255, 180, 120, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.2), inset 0 -1px 0 rgba(255, 180, 120, 0.5);
    }

    // 确保登录和注册页面容器高度一致
    .login-content-wrapper {
      min-height: 360px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }

    @media (max-width: 768px) {
      max-width: 95vw;
      min-height: auto;
      margin: 1rem;
      border-radius: 16px;

      &::before {
        border-radius: 18px;
      }

      .login-content-wrapper {
        min-height: 320px;
      }
    }

    @media (max-width: 480px) {
      max-width: 100vw;
      margin: 0.5rem;
      border-radius: 12px;

      &::before {
        border-radius: 14px;
      }

      .login-content-wrapper {
        min-height: 300px;
      }
    }
  }

  .login-logo {
    display: flex;
    margin-bottom: 20px;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      rgba(20, 35, 60, 0.9) 0%,
      rgba(30, 45, 70, 0.85) 50%,
      rgba(25, 40, 65, 0.88) 100%
    );
    padding: 1.5rem;
    position: relative;
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255, 180, 120, 0.3);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 180, 120, 0.15) 25%,
        rgba(255, 200, 140, 0.2) 50%,
        rgba(255, 180, 120, 0.15) 75%,
        transparent 100%
      );
      animation: scanLine 4s linear infinite;
      z-index: -1; // 确保在底层
      pointer-events: none; // 禁止鼠标事件
    }

    &::after {
      content: "";
      position: absolute;
      bottom: 0;
      left: 20%;
      right: 20%;
      height: 2px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 180, 120, 0.9),
        rgba(255, 200, 140, 1),
        rgba(255, 180, 120, 0.9),
        transparent
      );
      box-shadow: 0 0 10px rgba(255, 180, 120, 0.6);
      z-index: 1;
      pointer-events: none; // 禁止鼠标事件
    }

    @media (max-width: 480px) {
      padding: 1rem 0.5rem;
      margin-bottom: 15px;
    }

    .logo-img {
      margin-top: 8px;
      filter: drop-shadow(0 0 15px rgba(0, 191, 255, 0.8))
        drop-shadow(0 0 25px rgba(0, 255, 255, 0.4));
      transition: all 0.4s ease;
      position: relative;
      z-index: 2;

      &:hover {
        transform: scale(1.1) rotate(5deg);
        filter: drop-shadow(0 0 20px rgba(0, 191, 255, 1))
          drop-shadow(0 0 30px rgba(0, 255, 255, 0.6));
      }

      @media (max-width: 480px) {
        width: 32px !important;
        margin-top: 4px;
      }
    }

    .login-title {
      margin: 0;
      margin-left: 12px;
      padding-top: 10px;
      font-size: 1.875rem;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 180, 120, 0.3),
        0 1px 3px rgba(0, 0, 0, 0.9);
      letter-spacing: 1px;
      position: relative;
      z-index: 2;

      @media (max-width: 768px) {
        font-size: 1.5rem;
        margin-left: 8px;
      }

      @media (max-width: 480px) {
        font-size: 1.25rem;
        margin-left: 6px;
        padding-top: 6px;
      }
    }

    .svg-icon {
      font-size: 48px;

      @media (max-width: 480px) {
        font-size: 36px;
      }
    }
  }

  :deep(.ant-form) {
    padding: 0 25px 25px;
    position: relative;
    z-index: 5; // 确保表单在适当层级

    @media (max-width: 480px) {
      padding: 0 25px 25px;
    }
  }

  // 重置密码表单专用样式
  :deep(.password-reset-form) {
    .ant-form-item-label {
      padding-bottom: 8px;

      > label {
        color: rgba(255, 255, 255, 0.95) !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
        letter-spacing: 0.5px;
        height: auto !important;

        &::before {
          display: none !important; // 隐藏必填星号
        }
      }
    }

    .ant-form-item {
      margin-bottom: 24px;
    }
  }

  // 注册表单专用样式
  :deep(.register-form) {
    .ant-form-item-label {
      padding-bottom: 8px;

      > label {
        color: rgba(255, 255, 255, 0.95) !important;
        font-size: 14px !important;
        font-weight: 500 !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
        letter-spacing: 0.5px;
        height: auto !important;

        &::before {
          display: none !important; // 隐藏必填星号
        }
      }
    }

    .ant-form-item {
      margin-bottom: 24px;
    }
  }

  :deep(.ant-form-item) {

    @media (max-width: 480px) {
      margin-bottom: 16px;
    }
  }

  :deep(.ant-input),
  :deep(.ant-input-password) {
    height: 48px;
    border-radius: 12px;
    border: none !important;
    background: transparent !important;
    color: #e8f4fd !important;
    font-size: 15px;
    font-weight: 500;
    box-shadow: none !important;

    // readonly 状态不显示禁用样式
    &[readonly] {
      cursor: text !important;
      opacity: 1 !important;
      color: #e8f4fd !important;
      background: transparent !important;
    }

    &::placeholder {
      color: rgba(100, 255, 218, 0.5) !important;
    }

    // 处理浏览器自动填充样式
    &:-webkit-autofill,
    &:-webkit-autofill:hover,
    &:-webkit-autofill:focus,
    &:-webkit-autofill:active {
      -webkit-box-shadow: 0 0 0 1000px rgba(15, 30, 55, 0.95) inset !important;
      -webkit-text-fill-color: #e8f4fd !important;
      background-color: transparent !important;
      background-image: none !important;
      transition: background-color 5000s ease-in-out 0s;
      border: none !important;
    }

    &:hover {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #e8f4fd !important;
    }

    &:focus {
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      outline: none !important;
      color: #e8f4fd !important;
    }

    @media (max-width: 480px) {
      height: 44px;
      font-size: 16px; /* 防止iOS缩放 */
      border-radius: 10px;
    }
  }

  // 修复密码输入框反馈图标位置
  :deep(.ant-form-item-has-feedback) {
    .ant-input-password {
      padding-right: 50px !important;

      .ant-input {
        padding-right: 30px !important;
      }
    }

    .ant-form-item-feedback-icon {
      right: 16px !important;
      color: rgba(255, 180, 120, 0.9) !important;
      font-size: 16px !important;
      z-index: 10 !important;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.8)) !important;
    }

    &.ant-form-item-has-success {
      .ant-form-item-feedback-icon {
        color: #52c41a !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
      }
    }

    &.ant-form-item-has-error {
      .ant-form-item-feedback-icon {
        color: #ff6b6b !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
      }
    }
  }

  // 统一所有输入框的内边距
  :deep(.ant-input-affix-wrapper) {
    padding: 0 16px;
    height: 48px;
    border-radius: 12px;
    border: 1px solid rgba(255, 180, 120, 0.4);
    background: linear-gradient(
      145deg,
      rgba(25, 40, 65, 0.9) 0%,
      rgba(30, 45, 70, 0.85) 100%
    );
    backdrop-filter: blur(15px);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    box-shadow: inset 0 1px 0 rgba(255, 180, 120, 0.15), 0 2px 10px rgba(0, 0, 0, 0.3);

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 12px;
      padding: 1px;
      background: linear-gradient(
        45deg,
        rgba(255, 180, 120, 0.6),
        rgba(255, 200, 140, 0.4),
        rgba(255, 220, 160, 0.3),
        rgba(255, 200, 140, 0.4),
        rgba(255, 180, 120, 0.6)
      );
      mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      mask-composite: subtract;
      opacity: 0;
      transition: opacity 0.15s ease;
      z-index: -1;
    }

    .ant-input {
      padding: 0;
      height: 100%;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #e8f4fd !important;
      font-weight: 500;
      font-size: 15px;

      &::placeholder {
        color: rgba(100, 255, 218, 0.5) !important;
        font-weight: 400;
      }

      // 处理浏览器自动填充样式
      &:-webkit-autofill,
      &:-webkit-autofill:hover,
      &:-webkit-autofill:focus,
      &:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px rgba(15, 30, 55, 0.95) inset !important;
        -webkit-text-fill-color: #e8f4fd !important;
        background-color: transparent !important;
        background-image: none !important;
        transition: background-color 5000s ease-in-out 0s;
      }

      &:hover,
      &:focus {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        color: #e8f4fd !important;
      }
    }

    .anticon {
      color: rgba(255, 180, 120, 0.9);
      font-size: 16px;
      filter: drop-shadow(0 0 3px rgba(255, 180, 120, 0.4));
      transition: all 0.15s ease;
    }

    &:hover {
      border-color: rgba(255, 180, 120, 0.6);
      background: linear-gradient(
        145deg,
        rgba(30, 45, 75, 0.95) 0%,
        rgba(35, 50, 80, 0.9) 100%
      );
      box-shadow: inset 0 1px 0 rgba(255, 180, 120, 0.25),
        0 2px 12px rgba(255, 180, 120, 0.12), 0 1px 6px rgba(0, 0, 0, 0.4);

      &::before {
        opacity: 1;
      }

      .anticon {
        color: rgba(255, 200, 140, 1);
        filter: drop-shadow(0 0 6px rgba(255, 180, 120, 0.6));
      }
    }

    &:focus-within {
      border-color: rgba(255, 180, 120, 0.8);
      background: linear-gradient(
        145deg,
        rgba(35, 50, 85, 0.95) 0%,
        rgba(40, 55, 90, 0.9) 100%
      );
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 20px rgba(255, 180, 120, 0.2),
        0 2px 12px rgba(0, 0, 0, 0.5);
      transform: translateY(1px);

      &::before {
        opacity: 1;
      }

      .anticon {
        color: rgba(255, 220, 160, 1);
        filter: drop-shadow(0 0 8px rgba(255, 180, 120, 0.7));
      }
    }

    // 移除 Ant Design 默认的焦点状态
    &.ant-input-affix-wrapper-focused {
      border-color: rgba(100, 255, 218, 0.8) !important;
      box-shadow: inset 0 1px 0 rgba(100, 255, 218, 0.3),
        0 0 25px rgba(100, 255, 218, 0.2), 0 4px 20px rgba(0, 0, 0, 0.5) !important;
    }

    @media (max-width: 480px) {
      height: 44px;
      padding: 0 14px;
      border-radius: 10px;
    }
  }

  // 密码输入框特殊处理
  :deep(.ant-input-password) {
    height: 48px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(100, 255, 218, 0.3) !important;
    background: linear-gradient(
      145deg,
      rgba(10, 25, 47, 0.95) 0%,
      rgba(15, 30, 55, 0.9) 100%
    ) !important;
    backdrop-filter: blur(15px) !important;
    box-shadow: inset 0 1px 0 rgba(100, 255, 218, 0.1), 0 2px 10px rgba(0, 0, 0, 0.3) !important;
    padding: 0 16px !important;
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1) !important;

    .ant-input {
      padding-right: 0 !important;
      height: 100% !important;
      background: transparent !important;
      border: none !important;
      box-shadow: none !important;
      color: #e8f4fd !important;
      font-weight: 500 !important;
      font-size: 15px !important;

      &::placeholder {
        color: rgba(100, 255, 218, 0.5) !important;
      }

      &:-webkit-autofill,
      &:-webkit-autofill:hover,
      &:-webkit-autofill:focus,
      &:-webkit-autofill:active {
        -webkit-box-shadow: 0 0 0 1000px rgba(15, 30, 55, 0.95) inset !important;
        -webkit-text-fill-color: #e8f4fd !important;
        background-color: transparent !important;
        background-image: none !important;
        transition: background-color 5000s ease-in-out 0s;
        border: none !important;
      }

      &:hover,
      &:focus {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        outline: none !important;
        color: #e8f4fd !important;
      }
    }

    .ant-input-suffix {
      .anticon {
        color: rgba(255, 180, 120, 0.9) !important;
        font-size: 16px !important;
        filter: drop-shadow(0 0 3px rgba(255, 180, 120, 0.4)) !important;
        transition: all 0.15s ease !important;
      }
    }

    &:hover {
      border-color: rgba(100, 255, 218, 0.5) !important;
      background: linear-gradient(
        145deg,
        rgba(15, 30, 60, 0.98) 0%,
        rgba(20, 35, 65, 0.95) 100%
      ) !important;
      box-shadow: inset 0 1px 0 rgba(100, 255, 218, 0.2),
        0 2px 12px rgba(100, 255, 218, 0.08), 0 1px 6px rgba(0, 0, 0, 0.4) !important;
    }

    &:focus-within {
      border-color: rgba(100, 255, 218, 0.8) !important;
      background: linear-gradient(
        145deg,
        rgba(20, 35, 70, 0.98) 0%,
        rgba(25, 40, 75, 0.95) 100%
      ) !important;
      box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 0 20px rgba(100, 255, 218, 0.15),
        0 2px 12px rgba(0, 0, 0, 0.5) !important;
      transform: translateY(1px) !important;
    }

    @media (max-width: 480px) {
      height: 44px !important;
      padding: 0 14px !important;
      border-radius: 10px !important;
    }
  }

  // 验证码输入框的后缀图片样式
  :deep(.ant-input-suffix) {
    .absolute {
      position: relative;
      right: 0;
      height: 40px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
    }
  }

  :deep(.ant-btn) {
    height: 48px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    border: 1px solid rgba(0, 191, 255, 0.6);
    background: linear-gradient(
      145deg,
      rgba(0, 100, 200, 0.9) 0%,
      rgba(0, 150, 255, 0.8) 50%,
      rgba(0, 120, 220, 0.9) 100%
    );
    color: #ffffff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    box-shadow: 0 4px 15px rgba(0, 191, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
      content: "";
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      transition: left 0.5s ease;
    }

    &:hover {
      border-color: rgba(0, 255, 255, 0.8);
      background: linear-gradient(
        145deg,
        rgba(0, 120, 240, 0.95) 0%,
        rgba(0, 180, 255, 0.9) 50%,
        rgba(0, 140, 250, 0.95) 100%
      );
      box-shadow: 0 6px 20px rgba(0, 191, 255, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 0 25px rgba(0, 255, 255, 0.25);

      &::before {
        left: 100%;
      }
    }

    &:active {
      transform: translateY(2px);
      box-shadow: 0 2px 8px rgba(0, 191, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 480px) {
      height: 44px;
      font-size: 16px;
    }
  }

  :deep(.ant-tabs) {
    padding: 0 25px;
    position: relative;
    z-index: 10; // 确保标签页在最上层

    .ant-tabs-nav {
      margin-bottom: 24px;
      position: relative;
      z-index: 11;

      &::before {
        border-bottom: 1px solid rgba(0, 191, 255, 0.3);
      }
    }

    .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.7);
      font-weight: 500;
      transition: all 0.3s ease;
      position: relative;
      z-index: 12;
      cursor: pointer; // 确保鼠标样式
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);

      &:hover {
        color: rgba(255, 200, 140, 0.9);
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
      }

      &.ant-tabs-tab-active {
        .ant-tabs-tab-btn {
          color: #ffffff;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 10px rgba(255, 180, 120, 0.4);
        }
      }
    }

    .ant-tabs-content {
      position: relative;
      z-index: 9;
    }

    .ant-tabs-ink-bar {
      background: linear-gradient(
        90deg,
        rgba(0, 255, 255, 0.8),
        rgba(0, 191, 255, 1),
        rgba(0, 255, 255, 0.8)
      );
      height: 3px;
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
      z-index: 11;
    }
    
    // tabs 内部的表单不需要额外 padding，因为 tabs 已经有 padding
    .ant-form {
      padding: 0 0 25px !important;
    }

    @media (max-width: 480px) {
      padding: 0 25px;
      
      .ant-form {
        padding: 0 0 25px !important;
      }
    }
  }

  .login-footer-links {
    display: flex;
    justify-content: flex-end;
    margin-top: 5px;
    padding: 0 25px 15px;

    .login-mode-btn {
      height: auto !important;
      padding: 8px 16px !important;
      color: #ffffff !important;
      background: linear-gradient(
        135deg,
        rgba(255, 180, 120, 0.15) 0%,
        rgba(255, 200, 140, 0.1) 50%,
        rgba(255, 220, 160, 0.15) 100%
      ) !important;
      border: 1px solid rgba(255, 180, 120, 0.4) !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 8px rgba(255, 180, 120, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      transition: all 0.15s ease !important;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8) !important;
      backdrop-filter: blur(8px) !important;

      &:hover {
        color: #ffffff !important;
        background: linear-gradient(
          135deg,
          rgba(255, 200, 140, 0.25) 0%,
          rgba(255, 220, 160, 0.2) 50%,
          rgba(255, 240, 180, 0.25) 100%
        ) !important;
        border-color: rgba(255, 200, 140, 0.6) !important;
        box-shadow: 0 3px 10px rgba(255, 180, 120, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 8px rgba(255, 180, 120, 0.4) !important;
      }

      &:active {
        transform: translateY(1px) !important;
        box-shadow: 0 1px 4px rgba(255, 180, 120, 0.2), inset 0 2px 4px rgba(0, 0, 0, 0.1) !important;
      }
    }

    @media (max-width: 480px) {
      padding: 0 25px 15px;
      margin-top: 0;

      .login-mode-btn {
        font-size: 12px !important;
        padding: 6px 12px !important;
      }
    }
  }
  
  // 注册页面标题样式，与登录页面的 tabs 对齐
  .register-header {
    padding: 0 25px;
    margin-bottom: 24px;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 25px;
      right: 25px;
      height: 1px;
      background: rgba(0, 191, 255, 0.3);
    }
    
    .register-title {
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 16px;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9), 0 0 10px rgba(255, 180, 120, 0.4);
      position: relative;
      display: inline-block;
      
      &::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 16px;
        right: 16px;
        height: 3px;
        background: linear-gradient(
          90deg,
          rgba(0, 255, 255, 0.8),
          rgba(0, 191, 255, 1),
          rgba(0, 255, 255, 0.8)
        );
        border-radius: 2px;
        box-shadow: 0 0 10px rgba(0, 191, 255, 0.5);
      }
    }
  }

  .register-submit-btn {

    @media (max-width: 768px) {
      margin-top: 30px;
    }

    @media (max-width: 480px) {
      margin-top: 25px;
    }
  }

  // 添加加载状态的动画
  :deep(.ant-btn-loading) {
    .ant-btn-loading-icon {
      .anticon {
        color: #ffffff;
      }
    }
  }

  // 错误信息样式
  :deep(.ant-form-item-explain-error) {
    color: #ff8a80 !important;
    background: rgba(255, 138, 128, 0.08) !important;
    padding: 6px 10px !important;
    border-radius: 6px !important;
    margin-bottom: 16px !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.4 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6) !important;
    box-shadow: 0 1px 4px rgba(255, 138, 128, 0.15) !important;
    backdrop-filter: blur(4px) !important;
    transition: all 0.2s ease !important;

    @media (max-width: 480px) {
      font-size: 11px !important;
      padding: 5px 8px !important;
      margin-top: 10px !important;
      margin-bottom: 14px !important;
    }
  }

  // 成功信息样式（如果有）
  :deep(.ant-form-item-explain-success) {
    color: #a5d6a7 !important;
    background: rgba(165, 214, 167, 0.08) !important;
    border: 1px solid rgba(165, 214, 167, 0.25) !important;
    padding: 6px 10px !important;
    border-radius: 6px !important;
    margin-top: 12px !important;
    margin-bottom: 16px !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.4 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6) !important;
    box-shadow: 0 1px 4px rgba(165, 214, 167, 0.15) !important;
    backdrop-filter: blur(4px) !important;
  }

  // 警告信息样式
  :deep(.ant-form-item-explain-warning) {
    color: #ffcc80 !important;
    background: rgba(255, 204, 128, 0.08) !important;
    border: 1px solid rgba(255, 204, 128, 0.25) !important;
    padding: 6px 10px !important;
    border-radius: 6px !important;
    margin-top: 12px !important;
    margin-bottom: 16px !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.4 !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6) !important;
    box-shadow: 0 1px 4px rgba(255, 204, 128, 0.15) !important;
    backdrop-filter: blur(4px) !important;
  }
}
</style>
