type Props = {
  step: number;
};

const steps = [
  "Registro",
  "Funcionários",
  "Serviços",
  "Fotos",
  "NF's",
];

export default function StepIndicator({ step }: Props) {
  const currentLabel = steps[step - 1] || "Registro";
  const progress = (step / steps.length) * 100;

  return (
    <div className="wizard-step-card">
      <div className="wizard-step-header">
        <div className="wizard-step-number">{step}</div>

        <div className="wizard-step-texts">
          <span className="wizard-step-kicker">
            ETAPA {step} DE {steps.length}
          </span>
          <strong className="wizard-step-title">{currentLabel}</strong>
        </div>
      </div>

      <div className="wizard-progress-track">
        <div
          className="wizard-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}