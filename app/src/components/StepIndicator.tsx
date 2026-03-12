import React from "react";

type Props = {
  step: number;
};

export default function StepIndicator({ step }: Props) {

  const steps = [
    "Registro",
    "Funcionários",
    "Serviços",
    "Fotos",
    "NF's"
  ];

  return (
    <div className="step-indicator">

      {steps.map((label, index) => {

        const number = index + 1;
        const active = number === step;

        return (
          <div
            key={number}
            className={`step ${active ? "active" : ""}`}
          >

            <div className="step-circle">
              {number}
            </div>

            <span>{label}</span>

          </div>
        );

      })}

    </div>
  );
}