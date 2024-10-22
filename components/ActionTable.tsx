import React from 'react';
import { ActionData, getSudoPolicy } from '@rhinestone/module-sdk';
import { Address, Hex } from 'viem';
import ActionRow from './ActionRow';

interface ActionTableProps {
  actions: ActionData[];
  onActionsChange: (updatedActions: ActionData[]) => void;
}

const ActionTable: React.FC<ActionTableProps> = ({ actions: actionsData, onActionsChange }) => {
  const sudoPolicies = [
    {
      policy: getSudoPolicy().address,
      initData: getSudoPolicy().initData,
    },
  ];

  const handleInputChange = (
    index: number,
    field: 'actionTarget' | 'actionTargetSelector',
    value: Address | Hex
  ) => {
    const updatedActions = [...actionsData];
    updatedActions[index][field] = value;
    onActionsChange(updatedActions); // Call parent function to update state
  };

  const addAction = () => {
    const updatedActions = [...actionsData, { actionTarget: '0x' as Address, actionTargetSelector: '0x' as Hex, actionPolicies: sudoPolicies }];
    onActionsChange(updatedActions); // Update parent state
  };

  const removeAction = (index: number) => {
    const updatedActions = actionsData.filter((_, i) => i !== index);
    onActionsChange(updatedActions); // Update parent state
  };

  return (
    <div>
      <h3>Actions Table</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Target</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Selector</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {actionsData.map((action, index) => (
            <ActionRow
              key={index}
              action={action}
              index={index}
              onInputChange={handleInputChange}
              onRemove={removeAction}
            />
          ))}
        </tbody>
      </table>
      <button onClick={addAction} style={{ marginTop: '10px' }}>
        Add Action
      </button>
    </div>
  );
};

export default ActionTable;
