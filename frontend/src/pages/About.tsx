import { ArrowRight, BadgeCheck, Heart, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const values = [
  {
    icon: Ruler,
    title: 'Vừa vặn với bạn',
    description: 'Chọn màu sắc và kích thước phù hợp với phong cách riêng.'
  },
  {
    icon: BadgeCheck,
    title: 'Thông tin rõ ràng',
    description: 'Giá bán, ưu đãi và tồn kho được cập nhật theo dữ liệu cửa hàng.'
  },
  {
    icon: Heart,
    title: 'Mua sắm an tâm',
    description: 'Theo dõi đơn hàng và xem lại thông tin mua sắm ngay trên tài khoản.'
  }
];

const About = () => (
  <main className="bg-white">
    <section className="container grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 lg:py-16">
      <div className="max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          ZaidepYamiFashion
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Our Story
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Thời trang là cách bạn kể câu chuyện của chính mình. ZaidepYamiFashion
          được tạo nên để hành trình tìm thấy món đồ phù hợp trở nên gần gũi,
          rõ ràng và đầy cảm hứng hơn.
        </p>
        <p className="mt-4 leading-7 text-muted-foreground">
          Từ những lựa chọn thường ngày đến điểm nhấn cho phong cách riêng, chúng
          tôi tuyển chọn các sản phẩm để bạn dễ khám phá, lựa chọn và tự tin mặc
          theo cách của mình.
        </p>
        <Button asChild className="mt-8 gap-2">
          <Link to="/products">
            Khám phá bộ sưu tập <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-neutral-100">
        <img
          src="/z6729340048580_b1fbbf48a2e23fa3ef5aaecfb92f6fdd.jpg"
          alt="Không gian thời trang và phong cách ZaidepYamiFashion"
          className="aspect-[4/3] w-full object-cover object-center sm:aspect-[16/10] lg:aspect-[5/4]"
        />
      </div>
    </section>

    <section className="border-y bg-neutral-50">
      <div className="container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
        <div className="overflow-hidden rounded-2xl bg-neutral-100">
          <img
            src="/z6729340014435_db4041fcc9ab584dac15cec1e79505e7.jpg"
            alt="Phong cách thời trang tối giản"
            className="aspect-[4/3] w-full object-cover object-center"
            loading="lazy"
          />
        </div>
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Phong cách của bạn, lựa chọn của bạn
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Mặc điều bạn yêu. Theo cách của bạn.
          </h2>
          <p className="mt-5 leading-7 text-muted-foreground">
            Chúng tôi tin rằng trải nghiệm tốt bắt đầu từ những điều thiết thực:
            hình ảnh dễ xem, thông tin sản phẩm dễ hiểu, lựa chọn size và màu
            sắc rõ ràng. Mỗi chi tiết đều giúp bạn tự tin hơn trước khi chọn món
            đồ tiếp theo.
          </p>
        </div>
      </div>
    </section>

    <section className="container py-14 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Điều chúng tôi theo đuổi
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Trải nghiệm mua sắm rõ ràng, gần gũi
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {values.map(({ icon: Icon, title, description }) => (
          <article key={title} className="rounded-2xl border bg-white p-6 sm:p-7">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-semibold">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </section>

    <section className="bg-neutral-900 text-white">
      <div className="container flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center sm:py-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            ZaidepYamiFashion
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Tìm thấy phong cách tiếp theo của bạn.
          </h2>
        </div>
        <Button asChild variant="secondary" className="gap-2">
          <Link to="/products">
            Xem sản phẩm <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  </main>
);

export default About;
