class YouTubeChannelFinder {
    constructor() {
        this.searchForm = document.getElementById('searchForm');
        this.resultsContainer = document.getElementById('results');
        this.loadingIndicator = document.getElementById('loading');
        this.analyticsSummary = document.getElementById('analyticsSummary');
        this.channelModal = new bootstrap.Modal(document.getElementById('channelModal'));
        this.prospects = new Set();
        
        this.init();
    }

    init() {
        this.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchChannels();
        });

        document.getElementById('exportChannelData').addEventListener('click', () => {
            this.exportChannelData();
        });

        document.getElementById('addToProspects').addEventListener('click', () => {
            this.addCurrentChannelToProspects();
        });
    }

    async searchChannels() {
        try {
            this.showLoading();
            
            const filters = this.getSearchFilters();
            const searchQuery = this.buildSearchQuery(filters);
            
            const searchResponse = await this.fetchFromYouTube('/search', {
                part: 'snippet',
                q: searchQuery,
                type: 'channel',
                maxResults: config.MAX_RESULTS
            });

            const channels = await Promise.all(
                searchResponse.items.map(async item => {
                    const channelId = item.snippet.channelId;
                    const channelData = await this.getChannelDetails(channelId);
                    return {
                        ...item.snippet,
                        ...channelData
                    };
                })
            );

            const filteredChannels = this.filterChannels(channels, filters);
            this.displayAnalyticsSummary(filteredChannels);
            this.displayResults(filteredChannels);
        } catch (error) {
            console.error('Error searching channels:', error);
            this.showError('An error occurred while searching for channels. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    getSearchFilters() {
        return {
            categories: Array.from(document.getElementById('category').selectedOptions).map(opt => opt.value),
            minSubscribers: parseInt(document.getElementById('minSubscribers').value) || 0,
            maxSubscribers: parseInt(document.getElementById('maxSubscribers').value) || Infinity,
            minAvgViews: parseInt(document.getElementById('minAvgViews').value) || 0,
            engagementRate: document.getElementById('engagementRate').value,
            contentTypes: Array.from(document.getElementById('contentType').selectedOptions).map(opt => opt.value),
            uploadFrequency: document.getElementById('uploadFrequency').value,
            channelAge: document.getElementById('channelAge').value,
            monetizationStatus: document.getElementById('monetizationStatus').value,
            brandSafe: document.getElementById('brandSafe').checked,
            growthRate: document.getElementById('growthRate').value
        };
    }

    buildSearchQuery(filters) {
        let query = filters.categories.length ? filters.categories.join(' OR ') : 'youtube channels';
        if (filters.brandSafe) {
            query += ' family friendly';
        }
        return query;
    }

    async getChannelDetails(channelId) {
        try {
            const [channelResponse, uploadsResponse, analyticsResponse] = await Promise.all([
                this.fetchFromYouTube('/channels', {
                    part: 'statistics,snippet,brandingSettings,contentDetails',
                    id: channelId
                }),
                this.fetchFromYouTube('/search', {
                    part: 'snippet',
                    channelId: channelId,
                    order: 'date',
                    type: 'video',
                    maxResults: 50
                }),
                this.fetchChannelAnalytics(channelId)
            ]);

            if (!channelResponse.items.length) return null;

            const channel = channelResponse.items[0];
            const uploads = uploadsResponse.items;
            
            const channelAge = this.calculateChannelAge(channel.snippet.publishedAt);
            const uploadFrequency = this.calculateUploadFrequency(uploads);
            const engagementRate = this.calculateEngagementRate(channel.statistics, uploads);
            const growthRate = await this.calculateGrowthRate(channelId);
            const contentAnalysis = this.analyzeContent(uploads);
            const monetizationStatus = await this.checkMonetizationStatus(channelId);
            const socialLinks = this.extractSocialLinks(channel.snippet.description);

            return {
                statistics: channel.statistics,
                channelAge,
                uploadFrequency,
                engagementRate,
                growthRate,
                contentAnalysis,
                monetizationStatus,
                socialLinks,
                brandingSettings: channel.brandingSettings,
                uploads: uploads.slice(0, 10), // Keep only recent 10 uploads
                analytics: analyticsResponse
            };
        } catch (error) {
            console.error('Error fetching channel details:', error);
            return null;
        }
    }

    calculateChannelAge(publishedAt) {
        const age = (new Date() - new Date(publishedAt)) / (1000 * 60 * 60 * 24 * 365);
        if (age < 1) return 'new';
        if (age < 3) return 'growing';
        return 'established';
    }

    calculateUploadFrequency(uploads) {
        if (!uploads.length) return 'inactive';
        
        const uploadDates = uploads.map(video => new Date(video.snippet.publishedAt));
        const daysBetweenUploads = [];
        
        for (let i = 1; i < uploadDates.length; i++) {
            const days = (uploadDates[i-1] - uploadDates[i]) / (1000 * 60 * 60 * 24);
            daysBetweenUploads.push(days);
        }
        
        const avgDays = daysBetweenUploads.reduce((a, b) => a + b, 0) / daysBetweenUploads.length;
        
        if (avgDays <= 1) return 'daily';
        if (avgDays <= 7) return 'weekly';
        if (avgDays <= 14) return 'biweekly';
        if (avgDays <= 30) return 'monthly';
        return 'irregular';
    }

    calculateEngagementRate(statistics, uploads) {
        if (!uploads.length) return 0;
        
        const totalEngagements = uploads.reduce((sum, video) => {
            const stats = video.statistics || {};
            return sum + (parseInt(stats.likeCount) || 0) + (parseInt(stats.commentCount) || 0);
        }, 0);
        
        const avgEngagementRate = (totalEngagements / uploads.length) / parseInt(statistics.subscriberCount) * 100;
        
        if (avgEngagementRate > 10) return 'high';
        if (avgEngagementRate > 5) return 'medium';
        return 'low';
    }

    async calculateGrowthRate(channelId) {
        // Simulate growth rate calculation (in real app, use historical data)
        const growth = Math.random() * 30;
        if (growth > 20) return 'high';
        if (growth > 10) return 'medium';
        return 'low';
    }

    analyzeContent(uploads) {
        const analysis = {
            avgDuration: 0,
            contentTypes: new Set(),
            topics: new Set(),
            quality: 'medium'
        };

        uploads.forEach(video => {
            // Analyze video duration, type, and quality
            const duration = video.contentDetails?.duration || 'PT0M0S';
            const minutes = this.parseDuration(duration);
            
            if (minutes <= 1) analysis.contentTypes.add('short');
            else analysis.contentTypes.add('long');
            
            // Extract topics from titles and descriptions
            const text = `${video.snippet.title} ${video.snippet.description}`.toLowerCase();
            // Add basic topic detection logic here
        });

        return analysis;
    }

    async checkMonetizationStatus(channelId) {
        // Simulate monetization check (in real app, use appropriate API)
        return Math.random() > 0.5 ? 'monetized' : 'not_monetized';
    }

    async fetchChannelAnalytics(channelId) {
        // Simulate analytics data (in real app, use YouTube Analytics API)
        return {
            viewsGrowth: Math.floor(Math.random() * 100),
            subscriberGrowth: Math.floor(Math.random() * 50),
            revenueEstimate: Math.floor(Math.random() * 10000),
            audienceRetention: Math.floor(Math.random() * 100)
        };
    }

    filterChannels(channels, filters) {
        return channels.filter(channel => {
            const subscriberCount = parseInt(channel.statistics.subscriberCount);
            const viewCount = parseInt(channel.statistics.viewCount);
            
            if (subscriberCount < filters.minSubscribers || subscriberCount > filters.maxSubscribers) return false;
            if (viewCount < filters.minAvgViews) return false;
            if (filters.engagementRate && channel.engagementRate !== filters.engagementRate) return false;
            if (filters.uploadFrequency && channel.uploadFrequency !== filters.uploadFrequency) return false;
            if (filters.channelAge && channel.channelAge !== filters.channelAge) return false;
            if (filters.monetizationStatus && channel.monetizationStatus !== filters.monetizationStatus) return false;
            if (filters.growthRate && channel.growthRate !== filters.growthRate) return false;
            
            if (filters.contentTypes.length) {
                const hasMatchingContent = filters.contentTypes.some(type => 
                    channel.contentAnalysis.contentTypes.has(type)
                );
                if (!hasMatchingContent) return false;
            }

            return true;
        });
    }

    displayAnalyticsSummary(channels) {
        const summary = {
            totalChannels: channels.length,
            avgSubscribers: this.calculateAverage(channels, 'subscriberCount'),
            avgViews: this.calculateAverage(channels, 'viewCount'),
            monetizedChannels: channels.filter(c => c.monetizationStatus === 'monetized').length,
            highEngagement: channels.filter(c => c.engagementRate === 'high').length
        };

        this.analyticsSummary.classList.remove('d-none');
        this.analyticsSummary.querySelector('#analyticsData').innerHTML = `
            <div class="col-md-4">
                <div class="analytics-card">
                    <div class="analytics-value">${summary.totalChannels}</div>
                    <div class="analytics-label">Matching Channels</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="analytics-card">
                    <div class="analytics-value">${this.formatNumber(summary.avgSubscribers)}</div>
                    <div class="analytics-label">Avg. Subscribers</div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="analytics-card">
                    <div class="analytics-value">${summary.highEngagement}</div>
                    <div class="analytics-label">High Engagement Channels</div>
                </div>
            </div>
        `;
    }

    calculateAverage(channels, metric) {
        const sum = channels.reduce((acc, channel) => acc + parseInt(channel.statistics[metric]), 0);
        return Math.round(sum / channels.length);
    }

    displayResults(channels) {
        this.resultsContainer.innerHTML = channels.map(channel => this.createChannelCard(channel)).join('');
        
        document.querySelectorAll('.channel-card').forEach(card => {
            card.addEventListener('click', () => this.showChannelDetails(card.dataset.channelId));
        });
    }

    createChannelCard(channel) {
        const subscriberCount = this.formatNumber(channel.statistics.subscriberCount);
        const viewCount = this.formatNumber(channel.statistics.viewCount);
        
        return `
            <div class="col-md-6 col-lg-4">
                <div class="card channel-card" data-channel-id="${channel.channelId}">
                    <img src="${channel.thumbnails.high.url}" class="card-img-top" alt="${channel.title}">
                    <div class="card-body">
                        <h5 class="card-title">${channel.title}</h5>
                        <div class="channel-stats">
                            <span><i class="fas fa-users"></i> ${subscriberCount}</span>
                            <span><i class="fas fa-eye"></i> ${viewCount}</span>
                        </div>
                        <div class="mt-2">
                            <span class="badge badge-${channel.monetizationStatus}">
                                ${channel.monetizationStatus === 'monetized' ? 'Monetized' : 'Not Monetized'}
                            </span>
                            <span class="badge badge-growth-${channel.growthRate}">
                                ${channel.growthRate.charAt(0).toUpperCase() + channel.growthRate.slice(1)} Growth
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async showChannelDetails(channelId) {
        try {
            const channelData = await this.getChannelDetails(channelId);
            this.currentChannel = channelData;
            
            const tabContent = {
                overview: this.createOverviewTab(channelData),
                analytics: this.createAnalyticsTab(channelData),
                content: this.createContentTab(channelData),
                engagement: this.createEngagementTab(channelData),
                contact: this.createContactTab(channelData)
            };

            Object.entries(tabContent).forEach(([id, content]) => {
                document.getElementById(id).innerHTML = content;
            });

            // Initialize charts
            this.initializeCharts(channelData);
            
            this.channelModal.show();
        } catch (error) {
            console.error('Error showing channel details:', error);
        }
    }

    createOverviewTab(channel) {
        return `
            <div class="channel-details-header">
                <img src="${channel.thumbnails.high.url}" alt="${channel.title}">
                <div>
                    <h4>${channel.title}</h4>
                    <p>${this.formatNumber(channel.statistics.subscriberCount)} subscribers</p>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <div class="metric-value">${channel.uploadFrequency}</div>
                        <div class="metric-label">Upload Frequency</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <div class="metric-value">${channel.channelAge}</div>
                        <div class="metric-label">Channel Age</div>
                    </div>
                </div>
            </div>
            <div class="channel-description">
                ${channel.description}
            </div>
        `;
    }

    createAnalyticsTab(channel) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="chart-container">
                        <canvas id="growthChart"></canvas>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="chart-container">
                        <canvas id="engagementChart"></canvas>
                    </div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${channel.analytics.viewsGrowth}%</div>
                        <div class="metric-label">Views Growth</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">${channel.analytics.subscriberGrowth}%</div>
                        <div class="metric-label">Subscriber Growth</div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="metric-card">
                        <div class="metric-value">$${channel.analytics.revenueEstimate}</div>
                        <div class="metric-label">Est. Monthly Revenue</div>
                    </div>
                </div>
            </div>
        `;
    }

    createContentTab(channel) {
        const recentUploads = channel.uploads.map(video => `
            <div class="metric-card">
                <h6>${video.snippet.title}</h6>
                <div class="d-flex justify-content-between">
                    <small>${new Date(video.snippet.publishedAt).toLocaleDateString()}</small>
                    <small>${this.formatNumber(video.statistics?.viewCount || 0)} views</small>
                </div>
            </div>
        `).join('');

        return `
            <div class="row mb-4">
                <div class="col-12">
                    <h5>Recent Uploads</h5>
                    ${recentUploads}
                </div>
            </div>
        `;
    }

    createEngagementTab(channel) {
        return `
            <div class="row">
                <div class="col-md-6">
                    <div class="metric-card">
                        <div class="metric-value">${channel.engagementRate}</div>
                        <div class="metric-label">Engagement Rate</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="metric-card">
                        <div class="metric-value">${channel.analytics.audienceRetention}%</div>
                        <div class="metric-label">Audience Retention</div>
                    </div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="engagementTrendsChart"></canvas>
            </div>
        `;
    }

    createContactTab(channel) {
        return `
            <div class="contact-info">
                <h5>Contact Information</h5>
                ${this.formatSocialLinks(channel.socialLinks)}
            </div>
            <div class="mt-4">
                <h5>Brand Safety</h5>
                <div class="metric-card">
                    <div class="metric-value">${channel.brandingSettings.channel.moderateComments ? 'Moderated' : 'Unmoderated'}</div>
                    <div class="metric-label">Comment Moderation</div>
                </div>
            </div>
        `;
    }

    initializeCharts(channel) {
        // Growth Chart
        new Chart(document.getElementById('growthChart'), {
            type: 'line',
            data: {
                labels: ['3 Months Ago', '2 Months Ago', '1 Month Ago', 'Current'],
                datasets: [{
                    label: 'Subscriber Growth',
                    data: this.generateGrowthData(),
                    borderColor: '#1a73e8',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Engagement Chart
        new Chart(document.getElementById('engagementChart'), {
            type: 'doughnut',
            data: {
                labels: ['Likes', 'Comments', 'Shares'],
                datasets: [{
                    data: this.generateEngagementData(),
                    backgroundColor: ['#34a853', '#1a73e8', '#fbbc04']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Engagement Trends Chart
        new Chart(document.getElementById('engagementTrendsChart'), {
            type: 'bar',
            data: {
                labels: ['Last Week', '2 Weeks Ago', '3 Weeks Ago', '4 Weeks Ago'],
                datasets: [{
                    label: 'Engagement Rate',
                    data: this.generateEngagementTrendData(),
                    backgroundColor: '#1a73e8'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    generateGrowthData() {
        return Array.from({length: 4}, () => Math.floor(Math.random() * 1000));
    }

    generateEngagementData() {
        return Array.from({length: 3}, () => Math.floor(Math.random() * 100));
    }

    generateEngagementTrendData() {
        return Array.from({length: 4}, () => Math.random() * 10);
    }

    addCurrentChannelToProspects() {
        if (this.currentChannel) {
            this.prospects.add(this.currentChannel.channelId);
            alert('Channel added to prospects!');
        }
    }

    exportChannelData() {
        if (!this.currentChannel) return;

        const data = {
            channelTitle: this.currentChannel.title,
            statistics: this.currentChannel.statistics,
            analytics: this.currentChannel.analytics,
            engagement: {
                rate: this.currentChannel.engagementRate,
                retention: this.currentChannel.analytics.audienceRetention
            },
            content: this.currentChannel.contentAnalysis,
            contact: this.currentChannel.socialLinks
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentChannel.title}-analysis.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    formatSocialLinks(links) {
        let html = '';
        
        if (links.email.length) {
            html += `<p><i class="fas fa-envelope"></i> Email: ${links.email.join(', ')}</p>`;
        }
        
        const socialIcons = {
            instagram: 'fab fa-instagram',
            telegram: 'fab fa-telegram',
            twitter: 'fab fa-twitter',
            facebook: 'fab fa-facebook'
        };

        for (const [platform, icon] of Object.entries(socialIcons)) {
            if (links[platform].length) {
                html += `
                    <p><i class="${icon}"></i> ${platform.charAt(0).toUpperCase() + platform.slice(1)}:
                        ${links[platform].map(link => `<a href="${link}" target="_blank">${link}</a>`).join(', ')}
                    </p>
                `;
            }
        }

        return html || '<p>No contact information available</p>';
    }

    parseDuration(duration) {
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        const hours = (parseInt(match[1]) || 0);
        const minutes = (parseInt(match[2]) || 0);
        const seconds = (parseInt(match[3]) || 0);
        return hours * 60 + minutes + seconds / 60;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num;
    }

    showLoading() {
        this.loadingIndicator.classList.remove('d-none');
        this.resultsContainer.innerHTML = '';
        this.analyticsSummary.classList.add('d-none');
    }

    hideLoading() {
        this.loadingIndicator.classList.add('d-none');
    }

    showError(message) {
        this.resultsContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        `;
    }

    async fetchFromYouTube(endpoint, params) {
        const queryParams = new URLSearchParams({
            key: config.YOUTUBE_API_KEY,
            ...params
        });

        const response = await fetch(`${config.YOUTUBE_API_BASE_URL}${endpoint}?${queryParams}`);
        
        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.statusText}`);
        }

        return await response.json();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeChannelFinder();
}); 