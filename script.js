const { createApp } = Vue;

createApp({
  data() {
    return {
      settings: {
        members: ['Zdi Mohammed', 'Ba Kamal', '7amouda', 'L7aj Omar'],
        currencySymbol : 'DHS',
      },
      form: {
        title: '',
        payments: {},
        consumptions: {},
      },
      transactions: [],
      balances: {},
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

      for (const member of this.settings.members) {
        this.form.consumptions[member] = this.form.consumptions[member] || null;
      }
    },
    calculateConsumptionsBasedOnPayments() {
      const consumptionsCount = Object.keys(this.form.consumptions).length;

      if (consumptionsCount === 0 || this.paymentsTotal(this.form) === 0) {
        return;
      }

      const consumptionPerMember = this.paymentsTotal(this.form) / consumptionsCount;

      for (const member of Object.keys(this.form.consumptions)) {
        this.form.consumptions[member] = consumptionPerMember;
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
        delete this.form.consumptions[member];
      } else {
        this.form.consumptions[member] = null;
      }

      this.calculateConsumptionsBasedOnPayments();
    },
    consumptionForMemberInForm(member) {
      return typeof this.form.consumptions[member] !== 'undefined';
    },
    toggleFormPaymentForMember(member) {
      if (this.paymentForMemberInForm(member)) {
        delete this.form.payments[member];
      } else {
        this.form.payments[member] = null;
      }

      this.calculateConsumptionsBasedOnPayments();
    },
    paymentForMemberInForm(member) {
      return typeof this.form.payments[member] !== 'undefined';
    },
    memberIsPayer(transaction, member) {
      return Object.keys(transaction.payments).includes(member);
    },
    memberIsConsumer(transaction, member) {
      return Object.keys(transaction.consumptions).includes(member);
    },
    calculateMemberBalances() {
      for (const member of this.settings.members) {
        const payments = this.transactions
          .filter(transaction => this.memberIsPayer(transaction, member))
          .reduce((acc, transaction) => acc + transaction.payments[member], 0);

        const credits = this.transactions
          .filter(transaction => this.memberIsPayer(transaction, member))
          .reduce(function (acc, transaction) {
            const consumptions = { ...transaction.consumptions };

            delete consumptions[member];

            const credit = Object.values(consumptions).reduce((acc, consumption) => acc + consumption);

            return acc + credit;
          }, 0);

        const debts = this.transactions
          .filter(transaction => !this.memberIsPayer(transaction, member) && this.memberIsConsumer(transaction, member))
          .reduce((acc, transaction) => acc + transaction.consumptions[member], 0);

        const balance = credits - debts;

        this.balances[member] = { member, payments, credits, debts, balance };
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
  },
  mounted() {
    this.resetForm();
  },
}).mount('#app');
