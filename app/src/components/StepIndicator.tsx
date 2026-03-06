type StepIndicatorProps = {
  currentStep: number;
};

const steps = ["Registro", "Funcionários", "NF's", "Serviços", "Fotos"];

export default function StepIndicator({
  currentStep,
}: StepIndicatorProps) {
  return (
    <div className="rdo-steps">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isDone = currentStep > stepNumber;

        return (
          <div
            key={label}
            className={`rdo-step-item ${isActive ? "active" : ""} ${
              isDone ? "done" : ""
            }`}
          >
            <div className="rdo-step-bullet">{stepNumber}</div>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}