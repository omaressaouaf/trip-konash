const { createApp } = Vue;

createApp({
  data() {
    return {
      settings: {
        tripTitle: 'Chamal Trip',
        currencySymbol: 'DHS',
        members: [
          {
            id: 'zdi-1',
            name: 'Zdi Mohammed',
          },
          {
            id: 'ba-kamal',
            name: 'Ba Kamal',
          },
          {
            id: '7mouda',
            name: '7mouda',
          },
          {
            id: 'hajomar',
            name: 'L7aj Omar',
          },
        ],
      },
      form: {
        title: '',
        payments: {},
        consumptions: {},
      },
      transactions: [],
      balances: {},
      transactionsComponentShown: true,
      drawerShown: false,
    };
  },
  watch: {
    'form.payments': {
      handler: 'calculateConsumptionsBasedOnPayments',
      immediate: true,
      deep: true,
    },
    transactions: {
      handler: 'calculateMemberBalances',
      immediate: true,
      deep: true,
    },
  },
  computed: {
    nonDeletedSettingsMembers() {
      return this.settings.members.filter(member => !member.is_deleted);
    },
  },
  methods: {
    formatMoney(amount) {
      return Number(amount).toFixed(2) + ' ' + this.settings.currencySymbol;
    },
    resetForm() {
      this.form = {
        title: '',
        payments: {},
        consumptions: {},
      };

      for (const member of this.nonDeletedSettingsMembers) {
        this.form.consumptions[member.id] = this.form.consumptions[member.id] || null;
      }
    },
    calculateConsumptionsBasedOnPayments() {
      const consumptionsCount = Object.keys(this.form.consumptions).length;

      if (consumptionsCount === 0 || this.paymentsTotal(this.form) === 0) {
        return;
      }

      const consumptionPerMember = this.paymentsTotal(this.form) / consumptionsCount;

      for (const memberId of Object.keys(this.form.consumptions)) {
        this.form.consumptions[memberId] = consumptionPerMember;
      }
    },
    paymentsTotal(transaction) {
      return Object.values(transaction.payments).reduce((acc, payment) => acc + (payment || 0), 0);
    },
    consumptionsTotal(transaction) {
      return Object.values(transaction.consumptions).reduce((acc, consumption) => acc + (consumption || 0), 0);
    },
    toggleFormConsumptionForMember(member) {
      if (this.consumptionForMemberInForm(member)) {
        delete this.form.consumptions[member.id];
      } else {
        this.form.consumptions[member.id] = null;
      }

      this.calculateConsumptionsBasedOnPayments();
    },
    consumptionForMemberInForm(member) {
      return typeof this.form.consumptions[member.id] !== 'undefined';
    },
    toggleFormPaymentForMember(member) {
      if (this.paymentForMemberInForm(member)) {
        delete this.form.payments[member.id];
      } else {
        this.form.payments[member.id] = null;
      }

      this.calculateConsumptionsBasedOnPayments();
    },
    paymentForMemberInForm(member) {
      return typeof this.form.payments[member.id] !== 'undefined';
    },
    memberIsPayer(transaction, member) {
      return Object.keys(transaction.payments).includes(member.id);
    },
    memberIsConsumer(transaction, member) {
      return Object.keys(transaction.consumptions).includes(member.id);
    },
    getMemberById(memberId) {
      return this.settings.members.find(member => member.id == memberId);
    },
    calculateMemberBalances() {
      for (const member of this.settings.members) {
        const payments = this.transactions
          .filter(transaction => this.memberIsPayer(transaction, member))
          .reduce((acc, transaction) => acc + transaction.payments[member.id], 0);

        const credits = this.transactions
          .filter(transaction => this.memberIsPayer(transaction, member))
          .reduce(function (acc, transaction) {
            const consumptions = { ...transaction.consumptions };

            delete consumptions[member.id];

            if (!Object.keys(consumptions).length) {
              return acc;
            }

            const credit = Object.values(consumptions).reduce((acc, consumption) => acc + consumption);

            return acc + credit;
          }, 0);

        const debts = this.transactions
          .filter(transaction => !this.memberIsPayer(transaction, member) && this.memberIsConsumer(transaction, member))
          .reduce((acc, transaction) => acc + transaction.consumptions[member.id], 0);

        const balance = credits - debts;

        this.balances[member.id] = { payments, credits, debts, balance };
      }
    },
    handleSubmit() {
      if (this.paymentsTotal(this.form) === 0 || Object.values(this.form.payments).some(payment => !payment)) {
        alert('The payments are not set');
        return;
      }

      if (
        this.consumptionsTotal(this.form) === 0 ||
        Object.values(this.form.consumptions).some(consumption => !consumption)
      ) {
        alert('The consumptions are not set');
        return;
      }

      if (this.paymentsTotal(this.form) !== this.consumptionsTotal(this.form)) {
        alert('The total payments does not equal the total consumptions, make sure to set the correct values');
        return;
      }

      this.transactions.unshift(_.cloneDeep(this.form));

      this.resetForm();
    },
    removeTransaction(index) {
      if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
      }

      this.transactions.splice(index, 1);
    },
  },
  mounted() {
    this.resetForm();
  },
}).mount('#app');
