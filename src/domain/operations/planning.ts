import { addATC, formatATC, subtractATC } from '../money';
import type {
  OperationContext,
  OperationPlan,
  PlanningOperationName,
} from './types';
import {
  appendAudit,
  displayDate,
  findAccount,
  findGoal,
  findTransaction,
  floorAfter,
  mutableAccount,
  mutableGoal,
  mutableTransaction,
  optionalBoolean,
  optionalMinor,
  optionalNonEmptyString,
  requiredBoolean,
  requiredDate,
  requiredMinor,
  requiredMonth,
  requiredString,
  reservedForGoals,
  slug,
} from './utils';

function prepareCreateBudget(context: OperationContext): OperationPlan {
  const category = requiredString(context.args, 'category', 50);
  const limit = requiredMinor(context.args, 'limitMinor');
  const rollover = context.args.rollover === undefined
    ? false
    : requiredBoolean(context.args, 'rollover');
  if (context.state.budgets.some((budget) =>
    budget.category.toLocaleLowerCase('en-US') === category.toLocaleLowerCase('en-US'))) {
    throw new Error('A budget for this category already exists');
  }
  const id = `budget-${slug(category)}-${context.operationId.slice(-6)}`;
  return {
    title: `Create ${category} budget`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      `Monthly limit: ${formatATC(limit)}`,
      `Rollover: ${rollover ? 'on' : 'off'}`,
    ],
    reducer(draft) {
      draft.budgets.push({
        id,
        category,
        period: 'monthly',
        limit,
        spent: 0 as typeof limit,
        rollover,
      });
      appendAudit(draft, context, id, `${category} budget created.`);
    },
  };
}

function prepareUpdateBudget(context: OperationContext): OperationPlan {
  const id = requiredString(context.args, 'budgetId');
  const budget = context.state.budgets.find((item) => item.id === id);
  if (!budget) throw new Error('Budget was not found');
  const limit = optionalMinor(context.args, 'limitMinor') ?? budget.limit;
  const rollover = optionalBoolean(context.args, 'rollover') ?? budget.rollover;
  return {
    title: `Update ${budget.category} budget`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      `Monthly limit: ${formatATC(budget.limit)} → ${formatATC(limit)}`,
      `Rollover: ${rollover ? 'on' : 'off'}`,
    ],
    reducer(draft) {
      const mutable = draft.budgets.find((item) => item.id === budget.id);
      if (!mutable) throw new Error('Prepared budget is no longer available');
      mutable.limit = limit;
      mutable.rollover = rollover;
      appendAudit(draft, context, budget.id, `${budget.category} budget updated.`);
    },
  };
}

function prepareCreateGoal(context: OperationContext): OperationPlan {
  const name = requiredString(context.args, 'name', 60);
  const account = findAccount(context.state, requiredString(context.args, 'accountId'));
  const target = requiredMinor(context.args, 'targetMinor');
  const deadline = requiredDate(context.args, 'deadline', context.now);
  if (context.state.goals.some((goal) =>
    goal.name.toLocaleLowerCase('en-US') === name.toLocaleLowerCase('en-US'))) {
    throw new Error('A savings goal with this name already exists');
  }
  const id = `goal-${slug(name)}-${context.operationId.slice(-6)}`;
  return {
    title: `Create ${name} savings goal`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      `Target: ${formatATC(target)}`,
      `Deadline: ${displayDate(deadline)}`,
      `Savings account: ${account.name}`,
    ],
    reducer(draft) {
      draft.goals.push({
        id,
        name,
        accountId: account.id,
        target,
        savedAmount: 0 as typeof target,
        deadline,
        status: 'active',
      });
      appendAudit(draft, context, id, `${name} savings goal created.`);
    },
  };
}

function prepareUpdateGoal(context: OperationContext): OperationPlan {
  const goal = findGoal(context.state, requiredString(context.args, 'goalId'));
  const name = optionalNonEmptyString(context.args, 'name', 60) ?? goal.name;
  const target = optionalMinor(context.args, 'targetMinor') ?? goal.target;
  const deadline = context.args.deadline === undefined
    ? goal.deadline
    : requiredDate(context.args, 'deadline', context.now);
  if (target < goal.savedAmount) {
    throw new Error('Goal target cannot be below the amount already saved');
  }
  return {
    title: `Update ${goal.name} savings goal`,
    risk: 'medium',
    disclosure: [],
    consequences: [
      `Goal name: ${name}`,
      `Target: ${formatATC(target)}`,
      `Deadline: ${displayDate(deadline)}`,
    ],
    reducer(draft) {
      const mutable = mutableGoal(draft, goal.id);
      Object.assign(mutable, { name, target, deadline });
      mutable.status = mutable.savedAmount >= target ? 'completed' : 'active';
      appendAudit(draft, context, goal.id, `${goal.name} savings goal updated.`);
    },
  };
}

function prepareFundGoal(context: OperationContext): OperationPlan {
  const goal = findGoal(context.state, requiredString(context.args, 'goalId'));
  if (goal.status !== 'active') throw new Error('Savings goal is already complete');
  const source = findAccount(context.state, requiredString(context.args, 'sourceAccountId'));
  const destination = findAccount(context.state, goal.accountId);
  if (source.id === destination.id) {
    throw new Error('Choose a different source account for this goal');
  }
  const amount = requiredMinor(context.args, 'amountMinor');
  const requestedFloor = optionalMinor(context.args, 'balanceFloorMinor', { allowZero: true });
  const { after, floor } = floorAfter(
    source,
    amount,
    requestedFloor,
    reservedForGoals(context.state, source.id),
  );
  const savedAfter = addATC(goal.savedAmount, amount);
  if (savedAfter > goal.target) {
    throw new Error(`Contribution exceeds the remaining ${formatATC(subtractATC(goal.target, goal.savedAmount))}`);
  }
  return {
    title: `Fund ${goal.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Move ${formatATC(amount)} from ${source.name} to ${goal.name}`,
      `Source balance after: ${formatATC(after)}`,
      `Goal saved after: ${formatATC(savedAfter)}`,
      `Balance floor: ${formatATC(floor)}`,
    ],
    reducer(draft) {
      const mutableSource = mutableAccount(draft, source.id);
      const mutableDestination = mutableAccount(draft, destination.id);
      const mutable = mutableGoal(draft, goal.id);
      mutableSource.balance = subtractATC(mutableSource.balance, amount);
      mutableSource.availableBalance = subtractATC(mutableSource.availableBalance, amount);
      mutableDestination.balance = addATC(mutableDestination.balance, amount);
      mutableDestination.availableBalance = addATC(mutableDestination.availableBalance, amount);
      mutable.savedAmount = addATC(mutable.savedAmount, amount);
      mutable.status = mutable.savedAmount >= mutable.target ? 'completed' : 'active';
      const common = {
        amount,
        category: 'Savings goal',
        date: context.now.toISOString(),
        status: 'posted' as const,
        memo: `Fund ${goal.name}`,
        disputeStatus: 'ineligible' as const,
      };
      draft.transactions.push(
        {
          ...common,
          id: `transaction-goal-fund-out-${context.operationId}`,
          accountId: source.id,
          direction: 'debit',
          merchant: goal.name,
        },
        {
          ...common,
          id: `transaction-goal-fund-in-${context.operationId}`,
          accountId: destination.id,
          direction: 'credit',
          merchant: source.name,
        },
      );
      appendAudit(draft, context, goal.id, `${formatATC(amount)} added to ${goal.name}.`);
    },
  };
}

function prepareWithdrawGoal(context: OperationContext): OperationPlan {
  const goal = findGoal(context.state, requiredString(context.args, 'goalId'));
  const source = findAccount(context.state, goal.accountId);
  const destination = findAccount(
    context.state,
    requiredString(context.args, 'destinationAccountId'),
  );
  if (source.id === destination.id) {
    throw new Error('Choose a different destination account');
  }
  const amount = requiredMinor(context.args, 'amountMinor');
  if (amount > goal.savedAmount) {
    throw new Error(`Withdrawal exceeds the ${formatATC(goal.savedAmount)} saved in this goal`);
  }
  const reservedAfter = subtractATC(reservedForGoals(context.state, source.id), amount);
  const { after, floor } = floorAfter(source, amount, undefined, reservedAfter);
  return {
    title: `Withdraw from ${goal.name}`,
    risk: 'high',
    disclosure: [],
    consequences: [
      `Move ${formatATC(amount)} from ${goal.name} to ${destination.name}`,
      `Source balance after: ${formatATC(after)}`,
      `Goal saved after: ${formatATC(subtractATC(goal.savedAmount, amount))}`,
      `Remaining reserved floor: ${formatATC(floor)}`,
    ],
    reducer(draft) {
      const mutableSource = mutableAccount(draft, source.id);
      const mutableDestination = mutableAccount(draft, destination.id);
      const mutable = mutableGoal(draft, goal.id);
      mutableSource.balance = subtractATC(mutableSource.balance, amount);
      mutableSource.availableBalance = subtractATC(mutableSource.availableBalance, amount);
      mutableDestination.balance = addATC(mutableDestination.balance, amount);
      mutableDestination.availableBalance = addATC(mutableDestination.availableBalance, amount);
      mutable.savedAmount = subtractATC(mutable.savedAmount, amount);
      mutable.status = 'active';
      const common = {
        amount,
        category: 'Savings goal',
        date: context.now.toISOString(),
        status: 'posted' as const,
        memo: `Withdraw from ${goal.name}`,
        disputeStatus: 'ineligible' as const,
      };
      draft.transactions.push(
        {
          ...common,
          id: `transaction-goal-withdraw-out-${context.operationId}`,
          accountId: source.id,
          direction: 'debit',
          merchant: destination.name,
        },
        {
          ...common,
          id: `transaction-goal-withdraw-in-${context.operationId}`,
          accountId: destination.id,
          direction: 'credit',
          merchant: goal.name,
        },
      );
      appendAudit(draft, context, goal.id, `${formatATC(amount)} withdrawn from ${goal.name}.`);
    },
  };
}

function prepareCategorize(context: OperationContext): OperationPlan {
  const transaction = findTransaction(
    context.state,
    requiredString(context.args, 'transactionId'),
  );
  const category = requiredString(context.args, 'category', 50);
  return {
    title: `Categorize ${transaction.merchant} transaction`,
    risk: 'low',
    disclosure: [],
    consequences: [`Category: ${transaction.category} → ${category}`],
    reducer(draft) {
      mutableTransaction(draft, transaction.id).category = category;
      appendAudit(draft, context, transaction.id, `Transaction category changed to ${category}.`);
    },
  };
}

function prepareNote(context: OperationContext): OperationPlan {
  const transaction = findTransaction(
    context.state,
    requiredString(context.args, 'transactionId'),
  );
  const note = requiredString(context.args, 'note', 240);
  return {
    title: `Add note to ${transaction.merchant} transaction`,
    risk: 'low',
    disclosure: [],
    consequences: [
      'Replace the transaction note with the supplied text',
      `New note: ${note}`,
    ],
    reducer(draft) {
      mutableTransaction(draft, transaction.id).memo = note;
      appendAudit(draft, context, transaction.id, 'Transaction note updated.');
    },
  };
}

function prepareMonthlyPlan(context: OperationContext): OperationPlan {
  const month = requiredMonth(context.args, 'month');
  const totalBudget = context.state.budgets.reduce((sum, item) => sum + item.limit, 0);
  const totalSpent = context.state.budgets.reduce((sum, item) => sum + item.spent, 0);
  const upcoming = context.state.payments.filter(({ status, date }) =>
    status === 'scheduled' && date.slice(0, 7) === month);
  const subscriptions = context.state.subscriptions.filter(({ status, nextDate }) =>
    status === 'active' && nextDate.slice(0, 7) === month);
  return {
    title: `Prepare plan for ${month}`,
    risk: 'read',
    disclosure: ['Budgets, savings goals, subscriptions, and scheduled payments'],
    consequences: ['Return a planning summary without changing any banking state'],
    data: {
      month,
      budgetLimitMinor: totalBudget,
      budgetSpentMinor: totalSpent,
      goals: structuredClone(context.state.goals),
      subscriptions: structuredClone(subscriptions),
      upcomingPayments: structuredClone(upcoming),
    },
  };
}

export function preparePlanningOperation(
  context: OperationContext,
  operation: PlanningOperationName,
): OperationPlan {
  switch (operation) {
    case 'create_budget':
      return prepareCreateBudget(context);
    case 'update_budget':
      return prepareUpdateBudget(context);
    case 'create_savings_goal':
      return prepareCreateGoal(context);
    case 'update_savings_goal':
      return prepareUpdateGoal(context);
    case 'fund_savings_goal':
      return prepareFundGoal(context);
    case 'withdraw_from_goal':
      return prepareWithdrawGoal(context);
    case 'categorize_transaction':
      return prepareCategorize(context);
    case 'add_transaction_note':
      return prepareNote(context);
    case 'prepare_monthly_plan':
      return prepareMonthlyPlan(context);
  }
}
