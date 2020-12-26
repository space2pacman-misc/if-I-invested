let app = new Vue({
	el: "#app",
	data() {
		return {
			chart: null,
			isFound: null,
			isAnalyzed: null,
			symbols: [],
			prices: [],
			portfolio: [],
			invested: [],
			rest: 0,
			timestamp: null,
			investment: null,
			query: "",
			tab: "list",
			DAY: 1000 * 60 * 60 * 24,
			date: {
				from: "",
				to: ""
			},
			colors: {
				background: ["rgba(255, 99, 132, 0.2)", "rgba(54, 162, 235, 0.2)", "rgba(255, 206, 86, 0.2)" , "rgba(75, 192, 192, 0.2)", "rgba(153, 102, 255, 0.2)", "rgba(255, 159, 64, 0.2)"],
				border: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)", "rgba(75, 192, 192, 1)", "rgba(153, 102, 255, 1)", "rgba(255, 159, 64, 1)"]
			},
			api: {
				financialmodelingprep: {
					address: "financialmodelingprep.com",
					version: "v3",
					key: "13aeaece361347a11751def8c8fdcbb2",
					image: "https://fmpcloud.io/images-New-jpg/"
				},
				yahoo: {
					address: "apidojo-yahoo-finance-v1.p.rapidapi.com",
					key: "CaBa19WXFLmshpMiD6zoDb3PIcIYp1FUwucjsnS9hUOONgb7Gl"
				}
			},
			companies: {
				list: [],
				selected: []
			}
		}
	},
	watch: {
		query() {
			this.isFound = null;
		}
	},
	methods: {
		select(company) {
			let result = this.companies.selected.find(item => item.symbol === company.symbol);

			if(result) {
				let index = this.companies.selected.indexOf(company);

				this.companies.selected.splice(index, 1);
			} else {
				this.companies.selected.push(company);
			}
		},
		switchTab(tab) {
			this.tab = tab;
		},
		getDate(time) {
			let date = new Date(time * 1000);
			let day = date.getDate().toString().length === 1 ? "0" + date.getDate() : date.getDate();
			let month = date.getMonth().toString().length === 1 ? "0" + (date.getMonth() + 1) : date.getMonth() + 1;
			let year = date.getFullYear().toString().slice(2);
			let hours = date.getHours().toString().length === 1 ? "0" + date.getHours() : date.getHours();
			let minutes = date.getMinutes().toString().length === 1 ? "0" + date.getMinutes() : date.getMinutes();
			let seconds = date.getSeconds().toString().length === 1 ? "0" + date.getSeconds() : date.getSeconds();

			return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
		},
		request(address, headers) {
			return fetch(address, {
				headers: headers ? headers : {}
			}).then(async response => {
				return response.json();
			});
		},
		analyze() {
			let headers = {
				"x-rapidapi-key": "CaBa19WXFLmshpMiD6zoDb3PIcIYp1FUwucjsnS9hUOONgb7Gl",
				"x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
				"useQueryString": true
			}

			if(this.isAnalyzed === true) {
				this.isAnalyzed = null;
				this.prices = [];
			}

			if(this.isAnalyzed === null) {
				this.symbols = this.companies.selected.map(company => company.symbol);
			}

			this.isAnalyzed = false;

			if(this.symbols.length > 0) {
				this.request(`https://${this.api.yahoo.address}/stock/get-histories?symbol=${this.symbols[0]}&from=${Number(new Date(this.date.from)) / 1000}&to=${(Number(new Date(this.date.to)) + this.DAY) / 1000}&region=US&interval=1d`, headers).then(data => {
					if(this.timestamp === null) {
						this.timestamp = data.chart.result[0].timestamp.map(time => this.getDate(time));
					}
					
					this.prices.push(data.chart.result[0].indicators.quote[0].close);
					
					setTimeout(() => {
						this.symbols.splice(0, 1);
						this.analyze();
					}, 1000)
				});
			} else {
				this.isAnalyzed = true;
				this.calculate();
			}
		},
		checkFields(fields) {
			let flags = [];

			if(Array.isArray(fields)) {
				for(let i = 0; i < fields.length; i++) {
					if(typeof fields[i] === "string" && fields[i] !== ""
						|| typeof fields[i] === "object" && fields[i] !== null
						|| typeof fields[i] === "number" && fields[i] !== 0) {
						flags.push(true);
					} else {
						flags.push(false);
					}
				}
			} else {
				if(typeof fields === "string" && fields !== ""
						|| typeof fields === "object" && fields !== null
						|| typeof fields === "number" && fields !== 0) {
					flags.push(true);
				} else {
					flags.push(false);
				}
			}

			return !flags.every(flag => flag === true);
		},
		search() {
			if(this.query.length > 0) {
				this.isFound = false;
				this.companies.list = [];
				this.request(`https://${this.api.financialmodelingprep.address}/api/${this.api.financialmodelingprep.version}/search?query=${this.query}&limit=32&exchange=NASDAQ&apikey=${this.api.financialmodelingprep.key}`).then(data => {
					this.companies.list = data;
					this.isFound = true;
				})
			}
		},
		calculate() {
			this.names = this.companies.selected.map(company => company.name);
			this.rest = 0;
			this.invested = [];
			this.portfolio = [];
			this.prices.forEach(price => {
				let first = Math.floor(price[0]);
				let last = Math.floor(price[price.length - 1]);
				let investment = this.investment / this.prices.length;
				let stock = Math.floor(investment / first);
				let market = {
					start: stock * first,
					end: stock * last
				}

				this.invested.push(market.start);
				this.rest += Math.floor(investment - market.start);
				this.portfolio.push(Math.floor(market.end - market.start));
			});
		},
		getEarned() {
			return this.portfolio.reduce((a, b) => a + b);
		}
	},
	updated() {
		if(this.tab === "analysis") {
			this.chart = new Chart(this.$refs.chart.getContext('2d'), {
				type: "line",
				data: {
					labels: [],
					datasets: []
				},
				options: {
					responsive: false,
					maintainAspectRatio: false,
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero: true
							}
						}]
					}
				}
			});

			this.chart.height = 400;
			this.chart.width = this.chart.canvas.parentElement.offsetWidth;
			this.chart.canvas.width = this.chart.canvas.parentElement.offsetWidth;
			this.chart.data.labels = this.timestamp;
			this.prices.forEach((price, index) => {
				this.chart.data.datasets.push({
					label: `${this.companies.selected[index].name} (${this.companies.selected[index].symbol})`,
					data: price,
					backgroundColor: this.colors.background[index],
					borderColor: this.colors.border[index]
				})
			})
			this.chart.update();
		}
	}
})