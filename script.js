class DiscordCloner {
    constructor() {
        this.token = '';
        this.serverId = '';
        this.newServerName = '';
        this.progress = 0;
        this.stage = 'ПОДГОТОВКА';
        this.totalRoles = 0;
        this.totalChannels = 0;
        this.createdRoles = 0;
        this.createdChannels = 0;
        
        this.initElements();
        this.attachEvents();
    }
    
    initElements() {
        this.tokenInput = document.getElementById('token');
        this.serverIdInput = document.getElementById('serverId');
        this.nameInput = document.getElementById('newServerName');
        this.cloneBtn = document.getElementById('cloneBtn');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.stageText = document.getElementById('stageText');
        this.rolesCountEl = document.getElementById('rolesCount');
        this.channelsCountEl = document.getElementById('channelsCount');
    }
    
    attachEvents() {
        this.cloneBtn.addEventListener('click', () => this.startCloning());
    }
    
    updateProgress(percent, stage) {
        this.progress = percent;
        this.stage = stage;
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `ПРОГРЕСС: ${percent}%`;
        this.stageText.textContent = `ЭТАП: ${stage}`;
    }
    
    updateStats() {
        this.rolesCountEl.textContent = `${this.createdRoles}/${this.totalRoles}`;
        this.channelsCountEl.textContent = `${this.createdChannels}/${this.totalChannels}`;
    }
    
    async fetchAPI(endpoint, options = {}) {
        const response = await fetch(`https://discord.com/api/v9${endpoint}`, {
            ...options,
            headers: {
                'Authorization': this.token,
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error ${response.status}: ${error}`);
        }
        
        return response.json();
    }
    
    async getServerInfo() {
        return await this.fetchAPI(`/guilds/${this.serverId}`);
    }
    
    async getRoles() {
        return await this.fetchAPI(`/guilds/${this.serverId}/roles`);
    }
    
    async getChannels() {
        return await this.fetchAPI(`/guilds/${this.serverId}/channels`);
    }
    
    async createGuild(name, icon) {
        const data = { name };
        if (icon) data.icon = icon;
        return await this.fetchAPI('/guilds', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async createRole(guildId, role) {
        const roleData = {
            name: role.name.slice(0, 100),
            permissions: role.permissions,
            color: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable
        };
        
        return await this.fetchAPI(`/guilds/${guildId}/roles`, {
            method: 'POST',
            body: JSON.stringify(roleData)
        });
    }
    
    async createChannel(guildId, channel, roleMap) {
        let channelData = {
            name: channel.name.slice(0, 100),
            type: channel.type,
            position: channel.position,
            permission_overwrites: []
        };
        
        if (channel.type === 2) { // Голосовой канал
            channelData.bitrate = Math.min(channel.bitrate || 64000, 96000);
            channelData.user_limit = Math.min(channel.user_limit || 0, 99);
            channelData.rtc_region = channel.rtc_region;
            channelData.video_quality_mode = channel.video_quality_mode;
        } else if (channel.type === 0) { // Текстовый канал
            channelData.topic = channel.topic || '';
            channelData.nsfw = channel.nsfw || false;
            channelData.rate_limit_per_user = channel.rate_limit_per_user || 0;
        }
        
        // Обработка прав доступа
        if (channel.permission_overwrites) {
            channelData.permission_overwrites = channel.permission_overwrites
                .filter(overwrite => {
                    if (overwrite.type === 0 && roleMap[overwrite.id]) {
                        overwrite.id = roleMap[overwrite.id];
                        return true;
                    }
                    return overwrite.type === 1;
                })
                .map(overwrite => ({
                    id: overwrite.id,
                    type: overwrite.type,
                    allow: BigInt(overwrite.allow) & 0x3FFFFFFFFn,
                    deny: BigInt(overwrite.deny) & 0x3FFFFFFFFn
                }));
        }
        
        return await this.fetchAPI(`/guilds/${guildId}/channels`, {
            method: 'POST',
            body: JSON.stringify(channelData)
        });
    }
    
    async startCloning() {
        this.token = this.tokenInput.value.trim();
        this.serverId = this.serverIdInput.value.trim();
        this.newServerName = this.nameInput.value.trim();
        
        if (!this.token || !this.serverId) {
            alert('Введите токен и ID сервера!');
            return;
        }
        
        this.cloneBtn.disabled = true;
        this.cloneBtn.textContent = 'КЛОНИРОВАНИЕ...';
        
        try {
            // Получение данных
            this.updateProgress(5, 'ПОЛУЧЕНИЕ ДАННЫХ СЕРВЕРА');
            const serverInfo = await this.getServerInfo();
            const roles = await this.getRoles();
            const channels = await this.getChannels();
            
            const rolesToClone = roles.filter(r => r.id !== serverInfo.id);
            this.totalRoles = rolesToClone.length;
            const channelsToClone = channels;
            this.totalChannels = channelsToClone.length;
            this.updateStats();
            
            // Создание сервера
            this.updateProgress(10, 'СОЗДАНИЕ НОВОГО СЕРВЕРА');
            const icon = null; // Для простоты пропускаем иконку
            const newServer = await this.createGuild(
                this.newServerName || `${serverInfo.name} (Clone)`,
                icon
            );
            
            // Клонирование ролей
            this.updateProgress(15, 'КЛОНИРОВАНИЕ РОЛЕЙ');
            const roleMap = {};
            for (let i = 0; i < rolesToClone.length; i++) {
                const role = rolesToClone[i];
                await this.delay(300);
                const newRole = await this.createRole(newServer.id, role);
                roleMap[role.id] = newRole.id;
                this.createdRoles++;
                const percent = 15 + (i / rolesToClone.length) * 40;
                this.updateProgress(Math.floor(percent), `КЛОНИРОВАНИЕ РОЛЕЙ (${i+1}/${rolesToClone.length})`);
                this.updateStats();
            }
            
            // Клонирование каналов
            this.updateProgress(55, 'КЛОНИРОВАНИЕ КАНАЛОВ');
            for (let i = 0; i < channelsToClone.length; i++) {
                const channel = channelsToClone[i];
                await this.delay(500);
                await this.createChannel(newServer.id, channel, roleMap);
                this.createdChannels++;
                const percent = 55 + (i / channelsToClone.length) * 40;
                this.updateProgress(Math.floor(percent), `КЛОНИРОВАНИЕ КАНАЛОВ (${i+1}/${channelsToClone.length})`);
                this.updateStats();
            }
            
            this.updateProgress(100, 'ЗАВЕРШЕНО!');
            alert(`✅ Клонирование завершено!\nСоздан сервер: ${newServer.name}\nID: ${newServer.id}`);
            
        } catch (error) {
            console.error(error);
            alert(`❌ Ошибка клонирования:\n${error.message}\n\nПроверьте токен и права доступа.`);
        } finally {
            this.cloneBtn.disabled = false;
            this.cloneBtn.textContent = 'КЛОНИРОВАНИЕ';
        }
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    new DiscordCloner();
});