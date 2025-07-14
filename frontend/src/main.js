import { createApp } from 'vue';
import App from './App.vue';
import NaiveUI from 'naive-ui'

import './assets/css/chat.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'katex/dist/katex.min.css';

import './assets/iconfont/font_4808287_4twco1lu99y.woff2';
import './assets/iconfont/font_4808287_4twco1lu99y.woff';
import './assets/iconfont/font_4808287_4twco1lu99y.ttf';
import './assets/iconfont/font_4808287_4twco1lu99y.svg';
import './assets/fonts/Crystal-Medium.ttf';

const app = createApp(App);
app.use(NaiveUI);
app.mount('#app');