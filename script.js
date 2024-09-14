const { createApp } = Vue;

createApp({
  data() {
    return {
      settings: {
        tripTitle: '#NorthTrip',
        currencySymbol: 'DHS',
        members: [
          {
            id: 'member-1',
            name: 'Hamid',
          },
          {
            id: 'member-2',
            name: 'Mohamed',
          },
          {
            id: 'member-3',
            name: 'Kamal',
          },
          {
            id: 'member-4',
            name: 'Omar',
          },
        ],
      },
      settingsForm: {},
      form: {
        title: '',
        payments: {},
        consumptions: {},
      },
      transactions: [],
      balances: {},
      transactionsComponentShown: true,
      drawerShown: false,
      muteLocalStateWatchers: false,
    };
  },
  watch: {
    'form.payments': {
      handler: 'calculateConsumptionsBasedOnPayments',
      immediate: true,
      deep: true,
    },
    transactions: {
      handler() {
        if (this.muteLocalStateWatchers) {
          this.calculateMemberBalances();

          localStorage.setItem('transactions', JSON.stringify(this.transactions));
        }
      },
      immediate: true,
      deep: true,
    },
    settings: {
      handler() {
        if (this.muteLocalStateWatchers) {
          this.settingsForm = _.cloneDeep(this.settings);
          this.resetForm();
          this.calculateMemberBalances();

          localStorage.setItem('settings', JSON.stringify(this.settings));
        }
      },
      immediate: true,
      deep: true,
    },
  },
  computed: {
    nonDeletedSettingsMembers() {
      return this.settings.members.filter(member => !member.deleted);
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
      return this.settings.members.find(member => member.id === memberId);
    },
    calculateMemberBalances() {
      for (const member of this.settings.members) {
        const payments = this.transactions
          .filter(transaction => this.memberIsPayer(transaction, member))
          .reduce((acc, transaction) => acc + transaction.payments[member.id], 0);

        const balance = this.transactions.reduce(function (acc, transaction) {
          const transactionBalance =
            (transaction.payments[member.id] || 0) - (transaction.consumptions[member.id] || 0);

          return acc + transactionBalance;
        }, 0);

        this.balances[member.id] = { payments, balance };
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
    deleteTransaction(index) {
      if (!confirm('Are you sure you want to delete this transaction?')) {
        return;
      }

      this.transactions.splice(index, 1);
    },
    deleteMemberFromSettings(member, index) {
      if (
        !member.id ||
        this.transactions.every(
          transaction => !this.memberIsPayer(transaction, member) && !this.memberIsConsumer(transaction, member)
        )
      ) {
        this.settingsForm.members.splice(index, 1);

        return;
      }

      this.settingsForm.members = this.settingsForm.members.map(loopMember =>
        loopMember.id === member.id ? { ...loopMember, deleted: true } : loopMember
      );
    },
    handleUpdateSettings() {
      try {
        this.settingsForm.members.forEach((member, index) => {
          if (!member.id) {
            this.settingsForm.members[index]['id'] = btoa(Math.random().toString()) + Date.now();
          }

          if (!member.name) {
            throw new Error('Member must have a name');
          }
        });

        const membersIds = this.settingsForm.members.map(member => member.id);

        this.balances = Object.fromEntries(
          Object.entries(this.balances).filter(([memberId, value]) => membersIds.includes(memberId))
        );

        this.settings = _.cloneDeep(this.settingsForm);

        this.drawerShown = false;
      } catch (err) {
        alert(err.message);
      }
    },
    deleteAllTransactions() {
      if (!confirm('Are you sure you want to delete all transactions?')) {
        return;
      }

      this.transactions = [];
      this.drawerShown = false;
    },
  },
  mounted() {
    this.muteLocalStateWatchers = true;

    this.$nextTick(() => {
      try {
        this.transactions = JSON.parse(localStorage.getItem('transactions'));
        this.settings = JSON.parse(localStorage.getItem('settings'));
      } catch (err) {
        console.log(err);
      }

      this.saveState = false;
    });

    this.resetForm();
  },
}).mount('#app');
